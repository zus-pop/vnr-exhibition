"use client";
import ExhibitionModel from "@/components/ExhibitionModel";
import LocalModel from "@/components/LocalModel";
import PaintingFrame from "@/components/PaintingFrame";
import RemoteModel from "@/components/RemoteModel";
import { useCameraMovement } from "@/hooks/useCameraMovement";
import { useSocket } from "@/provider/SocketProvider";
import { userPersonStore } from "@/stores/person";
import {
  CameraControls,
  Environment,
  Html,
  Sparkles,
  TransformControls,
  useCursor,
  useProgress,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { button, useControls } from "leva";
import { Suspense, useEffect, useRef, useState } from "react";
import { Color, Group, Vector3 } from "three";
import { proxy, useSnapshot } from "valtio";
import { useSpring } from "@react-spring/three";

export type Data = {
  id: string;
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  position: number[];
  rotation: [number, number, number, string?];
  scale: number[];
};

interface ExhibitionSceneProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraControlsRef: React.RefObject<CameraControls | null>;
  onShowPanel: (item: Data) => void;
  showIcon: boolean;
  mode: string;
  edit: boolean;
  selectedItem: Data | null;
  data: Data[];
}
const state = proxy<{
  current: string | null;
  mode: number;
}>({
  current: null,
  mode: 0,
});
const modes: ["translate", "rotate", "scale"] = [
  "translate",
  "rotate",
  "scale",
];
const ExhibitionScene = ({
  cameraControlsRef,
  onShowPanel,
  showIcon,
  mode,
  edit,
  selectedItem,
  data,
}: ExhibitionSceneProps) => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (
      updates: {
        name: string;
        position: number[];
        rotation: [number, number, number, string?];
        scale: number[];
      }[]
    ) => {
      for (const update of updates) {
        const existing = data.find((d) => d.name === update.name);
        if (existing) {
          await axios.put(
            `${process.env.NEXT_PUBLIC_MOCK_API}/events/${existing.id}`,
            {
              ...existing,
              position: update.position,
              rotation: update.rotation,
              scale: update.scale,
            }
          );
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      alert("Saved!");
    },
    onError: (error) => {
      console.error("Error saving data:", error);
      alert("Error saving data.");
    },
  });
  const groupRef = useRef<Group>(null);
  const snap = useSnapshot(state);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  const [hovered, setHovered] = useState<boolean>(false);
  useCursor(hovered);
  const moveCameraToObject = useCameraMovement(cameraControlsRef);
  const persons = userPersonStore((state) => state.persons);
  const { socket } = useSocket();
  useControls({
    Save: button(
      () => {
        const items = groupRef.current?.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          rotation: child.rotation.toArray(),
          scale: child.scale.toArray(),
        }));
        mutate(items || []);
      },
      { disabled: isPending }
    ),
  });
  const [currentFrame, setCurrentFrame] = useState<Data | null>(null);

  useSpring({
    dummy: 1,
    from: 0,
    delay: 300,
    onRest: () => {
      moveCameraToObject(scene.getObjectByName("exhibition")!, {
        offsetX: -4,
        zoom: 0.8,
      });
    },
  });
  useEffect(() => {
    if (mode === "camera" && cameraControlsRef.current) {
      moveCameraToObject(scene.getObjectByName("exhibition")!, {
        offsetX: -4,
        zoom: 0.8,
      });
    }
  }, [mode, cameraControlsRef, scene, moveCameraToObject]);

  // Proximity detection for first person mode
  useFrame(() => {
    if (mode === "camera") return;

    let closestFrame: Data | null = null;
    let minDistance = Infinity;

    data.forEach((item) => {
      const distance = camera.position.distanceTo(
        new Vector3(item.position[0], item.position[1], item.position[2])
      );
      if (distance < minDistance && distance < 3) {
        minDistance = distance;
        closestFrame = item;
      }
    });

    setCurrentFrame(closestFrame);
  });

  // Key listener for "E" in first person mode
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (
        mode !== "camera" &&
        event.key.toLowerCase() === "e" &&
        currentFrame
      ) {
        onShowPanel(currentFrame);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [mode, currentFrame, onShowPanel]);

  return (
    <mesh>
      <ambientLight intensity={2} />
      <pointLight position={[10, 10, 10]} />
      <hemisphereLight
        groundColor={new Color(0xffffff)}
        intensity={1}
        position={[0, 50, 0]}
      />
      <directionalLight
        color={new Color(0xffffff)}
        intensity={1}
        position={[-8, 12, 8]}
        castShadow
      />
      <pointLight position={[0, 5, 5]} intensity={0.6} />
      <Environment preset="city" />
      <Physics timeStep={"vary"}>
        {(mode === "first person" || mode === "third person") &&
          persons.map((p) =>
            p.id === socket.id ? (
              <LocalModel
                key={p.id}
                hairColor={p.colors.hairColor}
                skinColor={p.colors.skinColor}
                mode={mode}
              />
            ) : (
              <RemoteModel
                key={p.id}
                modelId={p.id}
                hairColor={p.colors.hairColor}
                skinColor={p.colors.skinColor}
              />
            )
          )}
        <RigidBody type="fixed" colliders="trimesh">
          <ExhibitionModel name="exhibition" />
        </RigidBody>
        <group ref={groupRef}>
          {data.map((item) => {
            return (
              <PaintingFrame
                key={item.name}
                name={item.name}
                onShowPanel={onShowPanel}
                showIcon={showIcon}
                mode={mode}
                isClose={currentFrame === item}
                isOpen={!!selectedItem}
                onPointerMissed={(e) =>
                  e.type === "click" &&
                  mode === "camera" &&
                  edit &&
                  (state.current = null)
                }
                onContextMenu={(e) =>
                  snap.current === item.name &&
                  mode === "camera" &&
                  edit &&
                  (e.stopPropagation(),
                  (state.mode = (snap.mode + 1) % modes.length))
                }
                onPointerOver={(e) => {
                  if (mode !== "camera") return;
                  e.stopPropagation();
                  setHovered(true);
                }}
                onPointerOut={() => {
                  if (mode !== "camera") return;
                  setHovered(false);
                }}
                onClick={(e) => {
                  if (mode !== "camera") return;
                  e.stopPropagation();
                  if (edit) {
                    state.current = item.name;
                  }
                }}
                onMoveCamera={
                  mode === "camera" && !edit ? moveCameraToObject : undefined
                }
                item={item}
                position={[
                  item.position[0],
                  item.position[1],
                  item.position[2],
                ]}
                rotation={[
                  item.rotation[0],
                  item.rotation[1],
                  item.rotation[2],
                ]}
                scale={[item.scale[0], item.scale[1], item.scale[2]]}
              />
            );
          })}
        </group>
      </Physics>

      {mode === "camera" && (
        <>
          {edit && snap.current && (
            <TransformControls
              object={scene.getObjectByName(snap.current)}
              mode={modes[snap.mode]}
            />
          )}
          <CameraControls
            ref={cameraControlsRef}
            makeDefault
            minDistance={1}
            maxDistance={9}
            minPolarAngle={0} // Prevent tilting below the horizon (straight down)
            maxPolarAngle={Math.PI / 2}
            enabled
            smoothTime={0.5}
            restThreshold={0.5}
            verticalDragToForward={false}
            dollyToCursor={false}
            infinityDolly={false}
          />
        </>
      )}
    </mesh>
  );
};

const ExhibitionPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { data = [] } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axios.get<Data[]>(
        `${process.env.NEXT_PUBLIC_MOCK_API}/events`
      );
      return response.data;
    },
  });
  const { mode, edit } = useControls({
    mode: {
      value: "camera",
      options: {
        Camera: "camera",
        "Góc nhìn thứ nhất": "first person",
        "Góc nhìn thứ ba": "third person",
      },
      label: "Chế độ xem",
    },
    edit: {
      value: false,
      label: "Chế độ chỉnh sửa",
    },
  });
  const { progress } = useProgress();
  const cameraControlsRef = useRef<CameraControls>(null);
  const [selectedItem, setSelectedItem] = useState<Data | null>(null);
  const [pressed, setPressed] = useState({
    up: false,
    right: false,
    down: false,
    left: false,
  });
  const move = (action: "up" | "right" | "down" | "left") => {
    if (!cameraControlsRef.current) return;
    const distance = 3;
    switch (action) {
      case "up":
        cameraControlsRef.current.forward(distance, true);
        break;
      case "right":
        cameraControlsRef.current.truck(distance, 0, true);

        break;
      case "down":
        cameraControlsRef.current.forward(-distance, true);

        break;
      case "left":
        cameraControlsRef.current.truck(-distance, 0, true);

        break;
    }
  };
  useEffect(() => {
    if (mode !== "camera") {
      canvasRef.current?.requestPointerLock();
    } else {
      document.exitPointerLock();
    }
  }, [mode]);
  return (
    <>
      {mode === "camera" && (
        <div
          style={{
            position: "fixed",
            bottom: "80px",
            left: "80px",
            zIndex: 40,
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gridTemplateRows: "repeat(3, 1fr)",
              gap: "5px",
              width: "120px",
              height: "120px",
            }}
          >
            {/* Empty top-left */}
            <div></div>
            {/* Up */}
            <button
              onClick={() => move("up")}
              onMouseDown={() => setPressed({ ...pressed, up: true })}
              onMouseUp={() => setPressed({ ...pressed, up: false })}
              onMouseLeave={() => setPressed({ ...pressed, up: false })} // Reset if mouse leaves
              style={{
                gridColumn: 2,
                gridRow: 1,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.up ? "#555" : "#333", // Darker when pressed
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ↑
            </button>
            {/* Empty top-right */}
            <div></div>
            {/* Left */}
            <button
              onClick={() => move("left")}
              onMouseDown={() => setPressed({ ...pressed, left: true })}
              onMouseUp={() => setPressed({ ...pressed, left: false })}
              onMouseLeave={() => setPressed({ ...pressed, left: false })}
              style={{
                gridColumn: 1,
                gridRow: 2,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.left ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ←
            </button>
            {/* Empty center */}
            <div></div>
            {/* Right */}
            <button
              onClick={() => move("right")}
              onMouseDown={() => setPressed({ ...pressed, right: true })}
              onMouseUp={() => setPressed({ ...pressed, right: false })}
              onMouseLeave={() => setPressed({ ...pressed, right: false })}
              style={{
                gridColumn: 3,
                gridRow: 2,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.right ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              →
            </button>
            {/* Empty bottom-left */}
            <div></div>
            {/* Down */}
            <button
              onClick={() => move("down")}
              onMouseDown={() => setPressed({ ...pressed, down: true })}
              onMouseUp={() => setPressed({ ...pressed, down: false })}
              onMouseLeave={() => setPressed({ ...pressed, down: false })}
              style={{
                gridColumn: 2,
                gridRow: 3,
                padding: "8px",
                fontSize: "14px",
                backgroundColor: pressed.down ? "#555" : "#333",
                color: "white",
                border: "1px solid #555",
                borderRadius: "4px",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
            >
              ↓
            </button>
            {/* Empty bottom-right */}
            <div></div>
          </div>
        </div>
      )}
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 8, 800] }}
        shadows
        onDoubleClick={() => {
          if (mode === "camera") return;
          if (document.pointerLockElement) {
            document.exitPointerLock();
          } else {
            canvasRef.current?.requestPointerLock();
          }
        }}
      >
        <Suspense
          fallback={
            <Html
              center
              style={{
                color: "white",
                fontSize: "24px",
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              <div>
                <p>Đang tải...</p>
                <p>
                  {progress === 100 ? "Hoàn thành" : `${progress.toFixed(0)}%`}
                </p>
              </div>
            </Html>
          }
        >
          <ExhibitionScene
            data={data}
            mode={mode}
            edit={edit}
            cameraControlsRef={cameraControlsRef}
            canvasRef={canvasRef}
            onShowPanel={(item) => setSelectedItem(item)}
            showIcon={!selectedItem}
            selectedItem={selectedItem}
          />
          <Sparkles size={30} scale={80} count={800} />
        </Suspense>
      </Canvas>
      {selectedItem &&
        (document.exitPointerLock(),
        (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={() => (
              mode !== "camera" && canvasRef.current?.requestPointerLock(),
              setSelectedItem(null)
            )}
          >
            <div
              className="bg-white p-5 rounded-md max-w-6xl max-h-screen overflow-auto flex items-center gap-5 transform transition-transform duration-300 scale-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => (
                  mode !== "camera" && canvasRef.current?.requestPointerLock(),
                  setSelectedItem(null)
                )}
                className="absolute top-2 right-2 px-3 py-2 bg-black text-white border-none rounded cursor-pointer text-xl"
              >
                X
              </button>
              <img
                src={selectedItem.imageUrl}
                alt={selectedItem.title}
                className="w-1/2 h-auto max-h-80vh rounded shrink-0"
              />
              <div className="flex-1 text-left">
                <h4 className="text-2xl font-bold mb-2 text-black">
                  {selectedItem.title}
                </h4>
                <p className="mb-4 text-black">{selectedItem.description}</p>
              </div>
            </div>
          </div>
        ))}
    </>
  );
};

export default ExhibitionPage;

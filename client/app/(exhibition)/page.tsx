"use client";
import DienBienPhuModel from "@/components/DienBienPhuModel";
import ExhibitionModel from "@/components/ExhibitionModel";
import LocalModel from "@/components/LocalModel";
import PaintingFrame from "@/components/PaintingFrame";
import RemoteModel from "@/components/RemoteModel";
import {
  CameraMovementOptions,
  useCameraMovement,
} from "@/hooks/useCameraMovement";
import { useSocket } from "@/provider/SocketProvider";
import { usePersonStore } from "@/stores/person";
import { useSpring } from "@react-spring/three";
import {
  CameraControls,
  Environment,
  Float,
  Html,
  Sparkles,
  TransformControls,
  useCursor,
  useProgress,
} from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Physics, RigidBody } from "@react-three/rapier";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CustomEcctrlRigidBody } from "ecctrl";
import { button, buttonGroup, folder, useControls } from "leva";
import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Color, Group, Vector3 } from "three";
import { proxy, useSnapshot } from "valtio";

export type Data = {
  id: string;
  config: {
    isEditDisabled: boolean;
  };
  minigameUrl: string | null;
  minigameMessage: string;
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
  selectedItem: Data | null;
  data: Data[];
  isEditDisabled?: boolean;
}
const state = proxy<{
  current: string | null;
  mode: number;
  hovered: boolean;
  viewMode: "camera" | "first person" | "third person";
}>({
  current: null,
  mode: 0,
  hovered: false,
  viewMode: "camera",
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
  selectedItem,
  data,
  isEditDisabled,
}: ExhibitionSceneProps) => {
  const queryClient = useQueryClient();
  const { mutate } = useMutation({
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
  const localModelRef = useRef<CustomEcctrlRigidBody | null>(null);
  useCursor(snap.hovered);
  const moveCameraToObject = useCameraMovement(cameraControlsRef);
  const persons = usePersonStore((state) => state.persons);
  const { socket } = useSocket();
  const { edit } = useControls({
    edit: {
      value: false,
      label: "Chỉnh sửa",
      disabled: isEditDisabled,
    },
    "Danh sách": folder(
      (() => {
        const obj: Record<string, any> = {};
        data
          .sort((a, b) => Number(a.id) - Number(b.id))
          .forEach((item, index) => {
            obj[`${index + 1}. ${item.title}`] = button(() => {
              const options: CameraMovementOptions = { zoom: 1.2 };
              const isFigure = item.name === "thoi-khac-chien-thang";
              if (isFigure) {
                options.offsetX = -1;
                options.offsetY = 0.2;
              }
              moveCameraToObject(scene.getObjectByName(item.name)!, options);
            });
          });
        return obj;
      })(),
      { collapsed: true } // Optional: starts collapsed
    ),
    "Lưu thay đổi": button(
      () => {
        const items = groupRef.current?.children.map((child) => ({
          name: child.name,
          position: child.position.toArray(),
          rotation: child.rotation.toArray(),
          scale: child.scale.toArray(),
        }));
        console.log(items);
        mutate(items || []);
      },
      { disabled: isEditDisabled }
    ),
  });
  const [currentFrame, setCurrentFrame] = useState<Data | null>(null);

  useSpring({
    dummy: 1,
    from: 0,
    delay: 800,
    onRest: () => {
      const name = scene.getObjectByName("exhibition");
      if (!name) return;
      moveCameraToObject(name, {
        offsetX: -6,
        zoom: 0.4,
      });
    },
  });
  useEffect(() => {
    if (mode === "camera" && cameraControlsRef.current) {
      const name = scene.getObjectByName("exhibition");
      if (!name) return;
      moveCameraToObject(name, {
        offsetX: -6,
        zoom: 0.4,
      });
    }
  }, [mode, cameraControlsRef, scene, moveCameraToObject]);

  useFrame(() => {
    if (mode === "camera") return;

    if (!localModelRef.current) return;

    if (!localModelRef.current.group) return;

    const modelPosition = localModelRef.current.group.translation();

    let closestFrame: Data | null = null;
    let minDistance = Infinity;
    const offset = 6;

    data.forEach((item) => {
      const distance = new Vector3(
        modelPosition.x,
        modelPosition.y,
        modelPosition.z
      ).distanceTo(
        new Vector3(item.position[0], item.position[1], item.position[2])
      );
      if (distance < minDistance && distance < offset) {
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
        if (currentFrame.name === "minigame") {
          if (currentFrame.minigameUrl)
            window.open(currentFrame.minigameUrl, "_blank");
          else
            toast.info(
              currentFrame.minigameMessage || "Minigame chưa tạo đâu bruh!"
            );
          return;
        }
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
                position={p.position}
                rotation={p.rotation}
                localModelRef={localModelRef}
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
          <ExhibitionModel scale={1.8} name="exhibition" />
        </RigidBody>

        <group ref={groupRef}>
          {data.map((item) => {
            if (item.name === "minigame")
              return (
                <RigidBody
                  position={
                    item.position
                      ? [item.position[0], item.position[1], item.position[2]]
                      : undefined
                  }
                  scale={0.5}
                  key={item.name}
                  type="fixed"
                  colliders={"hull"}
                >
                  <Float
                    rotation={[Math.PI / 3.5, 0, 0]}
                    rotationIntensity={4}
                    floatIntensity={6}
                    speed={1.5}
                  >
                    <mesh
                      name={item.name}
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
                        state.hovered = true;
                      }}
                      onPointerOut={() => {
                        if (mode !== "camera") return;
                        state.hovered = false;
                      }}
                      onClick={(e) => {
                        if (mode !== "camera") return;
                        e.stopPropagation();
                        if (edit) {
                          state.current = item.name;
                        } else {
                          if (item.minigameUrl) {
                            window.open(item.minigameUrl, "_blank");
                          } else {
                            toast.info(
                              item.minigameMessage ||
                                "Minigame chưa tạo đâu bruh!"
                            );
                          }
                        }
                      }}
                    >
                      <torusKnotGeometry />
                      <meshNormalMaterial />
                      {currentFrame === item && (
                        <>
                          {!selectedItem && (
                            <>
                              <Html
                                position={[1, 0.44, 0.05]}
                                center
                                style={{
                                  color: "white",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "rgba(0, 0, 0, 0.7)",
                                  padding: "5px",
                                  width: "120px",
                                  borderRadius: "5px",
                                  pointerEvents: "none",
                                }}
                              >
                                Nhấn E để chơi
                              </Html>
                              <Html
                                position={[-0.9, 0.55, 0.05]}
                                center
                                style={{
                                  color: "white",
                                  fontSize: "14px",
                                  textAlign: "center",
                                  background: "rgba(0, 0, 0, 0.7)",
                                  padding: "5px",
                                  width: "120px",
                                  borderRadius: "5px",
                                  pointerEvents: "none",
                                }}
                              >
                                {item.title}
                              </Html>
                            </>
                          )}
                        </>
                      )}
                    </mesh>
                  </Float>
                </RigidBody>
              );
            if (item.name === "thoi-khac-chien-thang")
              return (
                <RigidBody key={item.name} type="fixed" colliders={"hull"}>
                  <DienBienPhuModel
                    name={item.name}
                    position={
                      item.position
                        ? [item.position[0], item.position[1], item.position[2]]
                        : undefined
                    }
                    scale={4}
                    onShowPanel={onShowPanel}
                    showIcon={showIcon}
                    mode={mode}
                    isClose={currentFrame === item}
                    isOpen={!!selectedItem}
                    onPointerOver={(e) => {
                      if (mode !== "camera") return;
                      e.stopPropagation();
                      state.hovered = true;
                    }}
                    onPointerOut={() => {
                      if (mode !== "camera") return;
                      state.hovered = false;
                    }}
                    onClick={() => {
                      if (mode !== "camera") return;
                      if (edit) {
                        state.current = item.name;
                      }
                    }}
                    onMoveCamera={
                      mode === "camera" && !edit
                        ? moveCameraToObject
                        : undefined
                    }
                    item={item}
                  />
                  <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[3, 1, 3]} />
                    <meshStandardMaterial color="black" />
                  </mesh>
                </RigidBody>
              );
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
                  state.hovered = true;
                }}
                onPointerOut={() => {
                  if (mode !== "camera") return;
                  state.hovered = false;
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
                position={
                  item.position
                    ? [item.position[0], item.position[1], item.position[2]]
                    : undefined
                }
                rotation={
                  item.rotation
                    ? [item.rotation[0], item.rotation[1], item.rotation[2]]
                    : undefined
                }
                scale={
                  item.scale
                    ? [item.scale[0], item.scale[1], item.scale[2]]
                    : undefined
                }
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
            minPolarAngle={edit ? undefined : Math.PI / 4}
            maxPolarAngle={edit ? undefined : Math.PI / 2}
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
  const snap = useSnapshot(state);
  const { data = [], isPending } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const response = await axios.get<Data[]>(
        `${process.env.NEXT_PUBLIC_MOCK_API}/events`
      );
      return response.data;
    },
  });
  //   const isEditDisabled = useMemo(() => {
  //     return data.find((d) => d.id === "0")?.config.isEditDisabled || false;
  //   }, [data]);
  useControls({
    "Chế độ xem": buttonGroup({
      Camera: () => (state.viewMode = "camera"),
      "Góc nhìn thứ nhất": () => (state.viewMode = "first person"),
      "Góc nhìn thứ ba": () => (state.viewMode = "third person"),
    }),
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
    if (snap.viewMode !== "camera") {
      setTimeout(() => {
        canvasRef.current?.requestPointerLock();
      }, 200);
    }
  }, [snap.viewMode]);

  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      fontSize: "24px",
      color: "white",
      backgroundColor: "rgba(0, 0, 0, 0.8)",
    }}
  >
    Đang tải...
  </div>;

  return (
    <>
      {snap.viewMode === "camera" && (
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
        camera={{ position: [0, 8, 3600] }}
        shadows
        onDoubleClick={() => {
          if (snap.viewMode === "camera") return;
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
                backgroundColor: "black",
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
            data={data.filter((d) => Number(d.id) !== 0)}
            mode={snap.viewMode}
            cameraControlsRef={cameraControlsRef}
            canvasRef={canvasRef}
            onShowPanel={(item) => setSelectedItem(item)}
            showIcon={!selectedItem}
            selectedItem={selectedItem}
            isEditDisabled={true}
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
              snap.viewMode !== "camera" &&
                canvasRef.current?.requestPointerLock(),
              setSelectedItem(null)
            )}
          >
            <div
              className="bg-white p-5 rounded-md max-w-6xl max-h-screen overflow-auto flex items-center gap-5 transform transition-transform duration-300 scale-100 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => (
                  snap.viewMode !== "camera" &&
                    canvasRef.current?.requestPointerLock(),
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

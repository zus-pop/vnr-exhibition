import { useSocket } from "@/provider/SocketProvider";
import { KeyboardControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import Ecctrl, {
  CustomEcctrlRigidBody,
  EcctrlAnimation,
  useGame,
} from "ecctrl";
import { useEffect, useRef } from "react";
import ChibiGuy from "./ChibiGuy";
import { useControls } from "leva";

interface LocalModelProps {
  hairColor?: string;
  skinColor?: string;
  mode?: "first person" | "third person";
  position: [number, number, number];
  rotation: [number, number, number, string];
  localModelRef: React.RefObject<CustomEcctrlRigidBody | null>;
}

const LocalModel = ({
  hairColor,
  skinColor,
  mode,
  localModelRef,
}: LocalModelProps) => {
  const { socket } = useSocket();
  const previousPosition = useRef({ x: 0, y: 0, z: 0 });
  const previousRotation = useRef({ x: 0, y: 0, z: 0, w: 1 });
  const currentAnimation = useGame((state) => state.curAnimation);
  const pressedRef = useRef<boolean>(false);

  useFrame(() => {
    if (!localModelRef.current) return;

    if (!localModelRef.current.group) return;

    if (localModelRef.current.group.translation().y < -1) {
      const currentPos = localModelRef.current.group.translation();
      localModelRef.current.group.setTranslation(
        { x: currentPos.x, y: 4, z: currentPos.z },
        true
      );
      localModelRef.current.group.setLinvel({ x: 0, y: 0, z: 0 }, true);
      localModelRef.current.group.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Check if object is moving
    const currentPos = localModelRef.current.group.translation();
    const currentRot = localModelRef.current.group.rotation();

    // Use different thresholds for different axes - Y-axis needs higher threshold
    const positionThreshold = {
      x: 0.001,
      y: 0.1, // Higher threshold for Y-axis to ignore small physics settling
      z: 0.001,
    };
    const rotationThreshold = 0.001;

    const hasPositionChanged =
      Math.abs(currentPos.x - previousPosition.current.x) >
        positionThreshold.x ||
      Math.abs(currentPos.y - previousPosition.current.y) >
        positionThreshold.y ||
      Math.abs(currentPos.z - previousPosition.current.z) > positionThreshold.z;

    const hasRotationChanged =
      Math.abs(currentRot.x - previousRotation.current.x) > rotationThreshold ||
      Math.abs(currentRot.y - previousRotation.current.y) > rotationThreshold ||
      Math.abs(currentRot.z - previousRotation.current.z) > rotationThreshold ||
      Math.abs(currentRot.w - previousRotation.current.w) > rotationThreshold;

    // Determine if object is actually moving (not just physics settling)
    const isMoving =
      hasPositionChanged || hasRotationChanged || pressedRef.current;

    if (isMoving) {
      socket.emit("localModelUpdate", {
        position: currentPos,
        rotation: currentRot,
        animation: currentAnimation,
        id: socket.id,
      });
    }

    previousPosition.current = { ...currentPos };
    previousRotation.current = { ...currentRot };
  });
  const keyboardMap = [
    { name: "forward", keys: ["ArrowUp", "KeyW"] },
    { name: "backward", keys: ["ArrowDown", "KeyS"] },
    { name: "leftward", keys: ["ArrowLeft", "KeyA"] },
    { name: "rightward", keys: ["ArrowRight", "KeyD"] },
    { name: "jump", keys: ["Space"] },
    { name: "run", keys: ["Shift"] },
    // Optional animation key map
    { name: "action1", keys: ["1"] },
    { name: "action2", keys: ["2"] },
    { name: "action3", keys: ["3"] },
    { name: "action4", keys: ["KeyF"] },
  ];

  const characterURL = "/chibi_guy/scene.gltf";

  const animationSet = {
    idle: "Idle",
    walk: "Walk",
    run: "Run",
    Jump: "Static Pose",
    JumpIdle: "Static Pose",
    JumpLand: "Idle",
    Fall: "Idle", // This is for falling from high sky
    // Currently support four additional animations
    action1: "Surprise",
    action2: "Clapping",
    action3: "Clapping",
    action4: "Clapping",
  };

  const { capsuleHalfHeight, capsuleRadius, floatHeight } = useControls({
    capsuleHalfHeight: { value: 0.1, min: 0.1, max: 2, step: 0.01 },
    capsuleRadius: { value: 0.4, min: 0.1, max: 2, step: 0.01 },
    floatHeight: { value: 0, min: 0, max: 2, step: 0.01 },
  });
  return (
    <KeyboardControls
      onChange={(_, pressed) => {
        pressedRef.current = pressed;
      }}
      map={keyboardMap}
    >
      <Ecctrl
        key={mode}
        animated
        camCollision={false}
        maxVelLimit={4}
        camInitDis={mode === "first person" ? -0.01 : 3}
        camMinDis={mode === "first person" ? -0.01 : 3}
        camMaxDis={mode === "first person" ? -0.01 : 3}
        camTargetPos={{ x: 0, y: 1, z: 0 }}
        camFollowMult={1000}
        camLerpMult={1000}
        turnVelMultiplier={1}
        turnSpeed={100}
        mode={mode === "first person" ? "CameraBasedMovement" : undefined}
        ref={localModelRef}
        position={[0, 4, 0]}
        capsuleHalfHeight={capsuleHalfHeight}
        capsuleRadius={capsuleRadius}
        floatHeight={floatHeight}
      >
        <EcctrlAnimation
          characterURL={characterURL}
          animationSet={animationSet}
        >
          <ChibiGuy hairColor={hairColor} skinColor={skinColor} />
        </EcctrlAnimation>
      </Ecctrl>
    </KeyboardControls>
  );
};

export default LocalModel;

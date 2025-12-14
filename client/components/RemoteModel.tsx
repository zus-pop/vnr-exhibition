import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody } from "@react-three/rapier";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useSocket } from "@/provider/SocketProvider";
import ChibiGuy from "./ChibiGuy";
import { Billboard, Html, RoundedBox, Text, Text3D } from "@react-three/drei";

interface RemoteModelProps {
  modelId: string;
  hairColor?: string;
  skinColor?: string;
}

const RemoteModel = ({ modelId, hairColor, skinColor }: RemoteModelProps) => {
  const { socket } = useSocket();
  const isTargetModel = useRef<boolean>(false);
  const modelRef = useRef<RapierRigidBody>(null);
  const [animation, setAnimation] = React.useState<
    "0Tpose" | "Clapping" | "Idle" | "Run" | "Surprise" | "Walk"
  >("Idle");
  const targetPosition = useRef<THREE.Vector3>(
    new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20)
  );
  const targetRotation = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0));

  const lerpFactor = 0.1;
  const maxDistance = 20;

  const [chatMessage, setChatMessage] = useState<string | null>(null);

  useFrame(() => {
    if (!modelRef.current) return;

    const currentPos = modelRef.current.translation();
    const currentRot = modelRef.current.rotation();

    // Convert to THREE.Vector3 for distance calculation
    const currentPosition3 = new THREE.Vector3(
      currentPos.x,
      currentPos.y,
      currentPos.z
    );
    const distance = currentPosition3.distanceTo(targetPosition.current);

    if (distance > maxDistance) {
      // Teleport
      modelRef.current.setTranslation(targetPosition.current, true);
      modelRef.current.setRotation(
        {
          x: targetRotation.current.x,
          y: targetRotation.current.y,
          z: targetRotation.current.z,
          w: 1,
        },
        true
      );
    } else {
      // Smooth interpolation
      const newPosition = {
        x: THREE.MathUtils.lerp(
          currentPos.x,
          targetPosition.current.x,
          lerpFactor
        ),
        y: THREE.MathUtils.lerp(
          currentPos.y,
          targetPosition.current.y,
          lerpFactor
        ),
        z: THREE.MathUtils.lerp(
          currentPos.z,
          targetPosition.current.z,
          lerpFactor
        ),
      };

      // For rotation, convert target euler to quaternion and lerp
      const targetQuat = new THREE.Quaternion().setFromEuler(
        targetRotation.current
      );
      const currentQuat = new THREE.Quaternion(
        currentRot.x,
        currentRot.y,
        currentRot.z,
        currentRot.w
      );
      currentQuat.slerp(targetQuat, lerpFactor);
      //   if (isTargetModel.current) {
      modelRef.current.setTranslation(newPosition, true);
      modelRef.current.setRotation(currentQuat, true);
      //   }
    }
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    socket.on(`remoteReceiveUpdate:${modelId}`, (data) => {
      //   console.log("RemoteModel received data:", data);

      if (data.position) {
        targetPosition.current.set(
          data.position.x,
          data.position.y,
          data.position.z
        );
      }

      if (data.rotation) {
        if (data.rotation.w !== undefined) {
          const quaternion = new THREE.Quaternion(
            data.rotation.x,
            data.rotation.y,
            data.rotation.z,
            data.rotation.w
          );

          targetRotation.current.setFromQuaternion(quaternion);
        } else {
          targetRotation.current.set(
            data.rotation.x,
            data.rotation.y,
            data.rotation.z
          );
        }

        // if (data.animation && data.id === modelId) {
        setAnimation(data.animation);
        // }
      }
    });

    socket.on(`remoteReceiveChatMessage:${modelId}`, (data) => {
      console.log("RemoteModel received chat message:", data);
      setChatMessage(data.message);
      timeoutId = setTimeout(() => {
        console.log("Clearing chat message");
        setChatMessage(null);
      }, 8000);
    });
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      socket.off(`remoteReceiveUpdate:${modelId}`);
      socket.off(`remoteReceiveChatMessage:${modelId}`);
    };
  }, []);
  return (
    <RigidBody
      position-y={0.9}
      ref={modelRef}
      type="kinematicPosition"
      colliders="hull"
    >
      {
        <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
          {chatMessage && (
            <RoundedBox
              position={[0, 1, 0]}
              args={[
                Math.max(1, chatMessage.length * 0.2),
                Math.max(0.5, chatMessage.length * 0.02),
                0.001,
              ]}
              radius={0.1}
              smoothness={4}
            >
              <meshBasicMaterial color="white" />
            </RoundedBox>
          )}
          <Text
            position={[0, 1, 0.01]}
            fontSize={0.3}
            color="black"
            anchorX="center"
            anchorY="middle"
          >
            {chatMessage}
          </Text>
        </Billboard>
      }
      <ChibiGuy
        hairColor={hairColor}
        skinColor={skinColor}
        animation={animation}
      />
    </RigidBody>
  );
};

export default RemoteModel;

import { CameraControls } from "@react-three/drei";
import { RefObject, useCallback } from "react";
import { Box3, Object3D, Vector3 } from "three";

export function useCameraMovement(
  cameraControlRef: RefObject<CameraControls | null>
) {
  const moveCameraToObject = useCallback(
    async (object: Object3D) => {
      if (!cameraControlRef.current) return;
      cameraControlRef.current.cancel();

      const box = new Box3().setFromObject(object);
      const sizeVec = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());

      const forward = new Vector3();
      object.getWorldDirection(forward);

      const distance = Math.max(sizeVec.x, sizeVec.y, sizeVec.z) * 0.5;
      const targetPosition = center
        .clone()
        .add(forward.clone().multiplyScalar(distance));

      const lookAtTarget = center;

      await cameraControlRef.current.setLookAt(
        targetPosition.x,
        targetPosition.y,
        targetPosition.z,
        lookAtTarget.x,
        lookAtTarget.y,
        lookAtTarget.z,
        true
      );
    },
    [cameraControlRef]
  );
  return moveCameraToObject;
}

import { useGLTF } from "@react-three/drei";

interface ExhibitionModelProps {}

const ExhibitionModel = (_props: ExhibitionModelProps) => {
  const { scene } = useGLTF(
    "https://firebasestorage.googleapis.com/v0/b/artchain-c46a7.firebasestorage.app/o/3D-models%2Fcircle.glb?alt=media&token=0a81c44f-565e-4cf1-9f20-85ac6a39d230"
  );
  return <primitive scale={1} object={scene} />;
};

useGLTF.preload(
  "https://firebasestorage.googleapis.com/v0/b/artchain-c46a7.firebasestorage.app/o/3D-models%2Fcircle.glb?alt=media&token=0a81c44f-565e-4cf1-9f20-85ac6a39d230"
);
export default ExhibitionModel;

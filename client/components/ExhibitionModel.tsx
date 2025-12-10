import { useGLTF } from "@react-three/drei";

interface ExhibitionModelProps {}

const ExhibitionModel = (_props: ExhibitionModelProps) => {
  const { scene } = useGLTF("/circle.glb");
  return <primitive scale={1} object={scene} />;
};

useGLTF.preload("/circle.glb");
export default ExhibitionModel;

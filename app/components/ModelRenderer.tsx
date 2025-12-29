import { useMemo } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { UploadedModel } from "../types";

interface ModelRendererProps {
  geometry: Array<{ x: number; y: number }>;
  uploadedModel?: UploadedModel | null;
}

export default function ModelRenderer({
  geometry,
  uploadedModel,
}: ModelRendererProps) {
  // IMPROVED: Load uploaded model if present
  const gltf =
    uploadedModel?.type === ".glb" || uploadedModel?.type === ".gltf"
      ? useGLTF(uploadedModel.url)
      : null;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (geometry.length > 0) {
      s.moveTo(geometry[0].x, geometry[0].y);
      geometry.forEach((p) => s.lineTo(p.x, p.y));
    }
    return s;
  }, [geometry]);

  // If uploaded model exists, render it instead
  if (gltf) {
    return (
      <primitive
        object={gltf.scene.clone()}
        scale={[1, 1, 1]}
        position={[0, 0, 0]}
      />
    );
  }

  // Otherwise render generated airfoil
  return (
    <mesh position={[0, 0, -0.5]}>
      <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

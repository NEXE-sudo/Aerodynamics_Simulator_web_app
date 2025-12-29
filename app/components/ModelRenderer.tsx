import { useMemo } from "react";
import * as THREE from "three";

interface ModelRendererProps {
  geometry: Array<{ x: number; y: number }>;
}

export default function ModelRenderer({ geometry }: ModelRendererProps) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (geometry.length > 0) {
      s.moveTo(geometry[0].x, geometry[0].y);
      geometry.forEach((p) => s.lineTo(p.x, p.y));
    }
    return s;
  }, [geometry]);

  return (
    <mesh position={[0, 0, -0.5]}>
      <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

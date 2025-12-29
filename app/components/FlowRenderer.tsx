import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FlowSimulation } from "../lib/simulation/FlowSimulation";

interface FlowRendererProps {
  simulation: FlowSimulation;
  streamlines: THREE.Vector3[][];
  isAnimating: boolean;
}

export default function FlowRenderer({
  simulation,
  isAnimating,
}: FlowRendererProps) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state, delta) => {
    if (!isAnimating) return;

    simulation.update(delta); // Uses clamped delta internally

    const positions = simulation.getPositions();
    const count = positions.length / 3;

    if (particlesRef.current) {
      const dummy = new THREE.Object3D();
      for (let i = 0; i < count; i++) {
        dummy.position.set(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const particleGeometry = useMemo(
    () => new THREE.SphereGeometry(0.04, 6, 6),
    []
  );
  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: "#93c5fd",
        transparent: true,
        opacity: 0.7,
      }),
    []
  );

  return (
    <group>
      <instancedMesh
        ref={particlesRef}
        args={[particleGeometry, particleMaterial, simulation.particles.length]}
      />
    </group>
  );
}

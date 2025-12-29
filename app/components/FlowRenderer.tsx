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
  streamlines,
  isAnimating,
}: FlowRendererProps) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  useFrame((state, delta) => {
    if (!isAnimating) return;

    simulation.update(delta);

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
    () => new THREE.SphereGeometry(0.035, 6, 6),
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

      {streamlines.map((line, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={line.length}
              array={new Float32Array(line.flatMap((v) => [v.x, v.y, v.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color="#60a5fa"
            transparent
            opacity={0.25}
            linewidth={2}
          />
        </line>
      ))}
    </group>
  );
}

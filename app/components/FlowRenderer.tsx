/**
 * FlowRenderer.tsx
 * ================
 * GPU-instanced particle rendering with honest velocity-based coloring.
 *
 * - Particles colored by actual simulated velocity magnitude
 * - Blue (slow) → Cyan → Green → Yellow (fast)
 * - No streamlines or competing visuals
 * - Single source of visual truth
 */

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { FlowSimulation } from "../lib/simulation/FlowSimulation";

interface FlowRendererProps {
  simulation: FlowSimulation;
  isAnimating: boolean;
}

export default function FlowRenderer({
  simulation,
  isAnimating,
}: FlowRendererProps) {
  const particlesRef = useRef<THREE.InstancedMesh>(null);

  // Create geometry with color attribute
  const particleGeometry = useMemo(() => {
    const geom = new THREE.SphereGeometry(0.04, 6, 6);

    // Initialize color attribute (will be updated per frame)
    const colors = new Float32Array(simulation.particles.length * 3);
    geom.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    return geom;
  }, [simulation.particles.length]);

  // Material with vertex colors enabled
  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        vertexColors: true, // Use per-instance colors
        transparent: true,
        opacity: 0.85,
      }),
    []
  );

  useFrame((state, delta) => {
    if (!isAnimating) return;

    // Update simulation (hardened time-stepping inside)
    simulation.update(delta);

    const positions = simulation.getPositions();
    const velocities = simulation.getVelocities();
    const count = positions.length / 3;

    if (particlesRef.current) {
      const dummy = new THREE.Object3D();
      const colorAttribute = particleGeometry.attributes.color;
      const colorArray = colorAttribute.array as Float32Array;

      for (let i = 0; i < count; i++) {
        // Update position
        dummy.position.set(
          positions[i * 3],
          positions[i * 3 + 1],
          positions[i * 3 + 2]
        );
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);

        // Update color based on velocity magnitude
        const vx = velocities[i * 3];
        const vy = velocities[i * 3 + 1];
        const vz = velocities[i * 3 + 2];
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);

        // Map speed to hue: 240° (blue) → 180° (cyan) → 120° (green) → 60° (yellow)
        const normalized = Math.min(speed / 0.5, 1.0); // Clamp to reasonable range
        const hue = 240 - normalized * 180; // 240° to 60°

        const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.6);
        colorArray[i * 3] = color.r;
        colorArray[i * 3 + 1] = color.g;
        colorArray[i * 3 + 2] = color.b;
      }

      particlesRef.current.instanceMatrix.needsUpdate = true;
      colorAttribute.needsUpdate = true;
    }
  });

  return (
    <group>
      <instancedMesh
        ref={particlesRef}
        args={[particleGeometry, particleMaterial, simulation.particles.length]}
      />
    </group>
  );
}

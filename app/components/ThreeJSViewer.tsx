"use client";

import React, { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { Point, UploadedModel } from "../types";

interface ThreeJSViewerProps {
  geometry: Point[];
  uploadedModel: UploadedModel | null;
  velocity: number;
  angleOfAttack: number;
  isAnimating: boolean;
}

// 1. SOLID GEOMETRY - Anchored at (0,0,0)
function AirfoilExtrusion({ points }: { points: Point[] }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (points.length > 0) {
      s.moveTo(points[0].x, points[0].y);
      points.forEach((p) => s.lineTo(p.x, p.y));
    }
    return s;
  }, [points]);

  return (
    <mesh position={[0, 0, -0.5]}>
      <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
      <meshStandardMaterial color="#3b82f6" metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

// 2. SOLID PHYSICS VOLUME
function PhysicsFlowVolume({ velocity, angle, geometry, active }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const numParticles = 2500;

  // Create a mathematical boundary from the geometry points
  const boundary = useMemo(() => {
    let minX = 0,
      maxX = 0,
      minY = 0,
      maxY = 0;
    geometry.forEach((p: Point) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    return { minX, maxX, minY, maxY, height: maxY - minY };
  }, [geometry]);

  const { posArr, initialY } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3);
    const yOrig = new Float32Array(numParticles);
    for (let i = 0; i < numParticles; i++) {
      pos[i * 3] = Math.random() * 10 - 5;
      pos[i * 3 + 1] = Math.random() * 4 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.0; // Spans Z-width
      yOrig[i] = pos[i * 3 + 1];
    }
    return { posArr: pos, initialY: yOrig };
  }, [geometry]);

  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    const pos = particlesRef.current.geometry.attributes.position;

    // Rotate flow around the wing center
    const angleRad = -(angle * THREE.MathUtils.DEG2RAD);
    if (groupRef.current) groupRef.current.rotation.z = angleRad;

    const step = velocity * delta * 0.2;

    for (let i = 0; i < numParticles; i++) {
      const i3 = i * 3;
      let x = pos.array[i3];
      let y = pos.array[i3 + 1];

      // Predict next position
      let nextX = x + step;
      let nextY = y;

      // SOLID COLLISION LOGIC
      // If particle enters the chord area
      if (nextX > boundary.minX && nextX < boundary.maxX) {
        const halfThick = boundary.height * 0.5;
        // If particle is within the thickness of the solid object
        if (Math.abs(nextY) < halfThick) {
          // SOLID BEHAVIOR: Do not allow entry. Push to surface.
          nextX = x; // Stop horizontal progress (Solid hit)
          nextY += y > 0 ? 0.05 : -0.05; // Deflect along surface
        }
      }

      // Reset loop
      if (nextX > 5) {
        nextX = -5;
        nextY = initialY[i];
      }

      pos.array[i3] = nextX;
      pos.array[i3 + 1] = nextY;
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      {/* Streamline layers spanning width */}
      {[-0.4, 0, 0.4].map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          {[-1, -0.5, 0.5, 1].map((y, j) => (
            <mesh key={j} position={[0, y, 0]}>
              <boxGeometry args={[10, 0.01, 0.01]} />
              <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} />
            </mesh>
          ))}
        </group>
      ))}

      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={numParticles}
            array={posArr}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.04}
          color="#93c5fd"
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function ThreeJSViewer(props: ThreeJSViewerProps) {
  return (
    <div className="w-full h-full relative bg-slate-950 rounded-xl border border-slate-800">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 3, 5]} fov={45} />
        <Suspense fallback={null}>
          <AirfoilExtrusion points={props.geometry} />
          <PhysicsFlowVolume {...props} />
          <Environment preset="night" />
        </Suspense>
        <Grid infiniteGrid sectionColor="#334155" cellColor="#1e293b" />
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
      </Canvas>
    </div>
  );
}

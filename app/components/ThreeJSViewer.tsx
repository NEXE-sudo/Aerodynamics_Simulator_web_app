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

// 2. SOLID PHYSICS VOLUME WITH RAYCASTING
function PhysicsFlowVolume({ velocity, angle, geometry, active }: any) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const numParticles = 2500;

  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const { posArr, velArr, prevArr, initialData } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3);
    const vel = new Float32Array(numParticles * 3);
    const prev = new Float32Array(numParticles * 3);
    const init = new Float32Array(numParticles * 3);

    for (let i = 0; i < numParticles; i++) {
      const i3 = i * 3;
      const x = Math.random() * 10 - 5;
      const y = Math.random() * 4 - 2;
      const z = (Math.random() - 0.5) * 1.0;

      pos[i3] = x;
      pos[i3 + 1] = y;
      pos[i3 + 2] = z;

      prev[i3] = x;
      prev[i3 + 1] = y;
      prev[i3 + 2] = z;

      init[i3] = x;
      init[i3 + 1] = y;
      init[i3 + 2] = z;

      vel[i3] = 0.2;
      vel[i3 + 1] = 0;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return { posArr: pos, velArr: vel, prevArr: prev, initialData: init };
  }, [geometry]);

  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    const pos = particlesRef.current.geometry.attributes.position;

    const angleRad = -(angle * THREE.MathUtils.DEG2RAD);
    if (groupRef.current) groupRef.current.rotation.z = angleRad;

    const step = velocity * delta * 0.2;

    for (let i = 0; i < numParticles; i++) {
      const i3 = i * 3;

      prevArr[i3] = pos.array[i3];
      prevArr[i3 + 1] = pos.array[i3 + 1];
      prevArr[i3 + 2] = pos.array[i3 + 2];

      const currentPos = new THREE.Vector3(
        pos.array[i3],
        pos.array[i3 + 1],
        pos.array[i3 + 2]
      );

      const velVector = new THREE.Vector3(
        velArr[i3] * step,
        velArr[i3 + 1] * step,
        velArr[i3 + 2] * step
      );

      const nextPos = currentPos.clone().add(velVector);
      let finalPos = nextPos;
      let collision = false;

      if (meshRef.current && velVector.length() > 0.001) {
        const direction = velVector.clone().normalize();
        const distance = velVector.length();

        raycaster.set(currentPos, direction);
        raycaster.far = distance * 1.2;

        const intersects = raycaster.intersectObject(meshRef.current, false);

        if (intersects.length > 0) {
          const hit = intersects[0];
          collision = true;

          finalPos = hit.point
            .clone()
            .add(hit.face!.normal.clone().multiplyScalar(0.01));

          const incomingVel = new THREE.Vector3(
            velArr[i3],
            velArr[i3 + 1],
            velArr[i3 + 2]
          );
          const reflected = incomingVel
            .clone()
            .reflect(hit.face!.normal)
            .multiplyScalar(0.7);

          velArr[i3] = reflected.x;
          velArr[i3 + 1] = reflected.y;
          velArr[i3 + 2] = reflected.z;
        }
      }

      if (!collision) {
        velArr[i3 + 2] += (Math.random() - 0.5) * 0.002;
        velArr[i3 + 2] = Math.max(-0.05, Math.min(0.05, velArr[i3 + 2]));
      }

      if (finalPos.x > 5) {
        finalPos.x = -5;
        finalPos.y = initialData[i3 + 1];
        finalPos.z = initialData[i3 + 2];

        velArr[i3] = 0.2;
        velArr[i3 + 1] = 0;
        velArr[i3 + 2] = (Math.random() - 0.5) * 0.05;
      }

      pos.array[i3] = finalPos.x;
      pos.array[i3 + 1] = finalPos.y;
      pos.array[i3 + 2] = finalPos.z;
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -0.5]} ref={meshRef}>
        <extrudeGeometry
          args={[
            (() => {
              const s = new THREE.Shape();
              if (geometry.length > 0) {
                s.moveTo(geometry[0].x, geometry[0].y);
                geometry.forEach((p: Point) => s.lineTo(p.x, p.y));
              }
              return s;
            })(),
            { depth: 1, bevelEnabled: false },
          ]}
        />
        <meshStandardMaterial visible={false} />
      </mesh>

      {[-0.6, -0.3, 0, 0.3, 0.6].map((z) =>
        [-1.5, -1, -0.5, 0, 0.5, 1, 1.5].map((y) => (
          <mesh key={`${z}-${y}`} position={[0, y, z]}>
            <boxGeometry args={[10, 0.008, 0.008]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.15} />
          </mesh>
        ))
      )}

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
          <PhysicsFlowVolume {...props} geometry={props.geometry} />
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

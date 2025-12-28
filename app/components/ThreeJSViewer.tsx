"use client";

import React, { Suspense, useMemo, useRef, useEffect } from "react";
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

// Simplified Airfoil with proper key to force remount
function AirfoilExtrusion({ points, key }: { points: Point[]; key: string }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    if (points.length > 0) {
      s.moveTo(points[0].x, points[0].y);
      points.forEach((p) => s.lineTo(p.x, p.y));
    }
    return s;
  }, [points]);

  return (
    <mesh rotation={[0, 0, 0]} key={key}>
      <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
      <meshStandardMaterial
        color="#3b82f6"
        emissive="#1d4ed8"
        emissiveIntensity={0.3}
        metalness={0.7}
        roughness={0.2}
      />
    </mesh>
  );
}

// Helper to map a value to a SolidWorks-style Rainbow (Blue-Cyan-Green-Yellow-Red)
const getFlowColor = (normalizedValue: number) => {
  const color = new THREE.Color();
  // 0.0 (Slow/High Pressure) = Blue
  // 1.0 (Fast/Low Pressure) = Red
  color.setHSL(0.7 * (1 - normalizedValue), 1, 0.5);
  return color;
};

function AnimatedFlowParticles({ velocity, angle, geometry, active }: any) {
  const particlesRef = useRef<THREE.Points>(null);
  const numParticles = 800; // Increased density for "SolidWorks" look

  const { positions, colors, data } = useMemo(() => {
    const pos = new Float32Array(numParticles * 3);
    const cols = new Float32Array(numParticles * 3);
    const particleData = []; // Store individual offsets

    for (let i = 0; i < numParticles; i++) {
      const i3 = i * 3;
      pos[i3] = Math.random() * 10 - 5;
      pos[i3 + 1] = Math.random() * 4 - 2;
      pos[i3 + 2] = Math.random() * 2 - 1;

      particleData.push({
        speedOffset: Math.random() * 0.5 + 0.8,
        yOffset: pos[i3 + 1],
      });
    }
    return { positions: pos, colors: cols, data: particleData };
  }, []);

  useFrame((state, delta) => {
    if (!particlesRef.current || !active) return;
    const posAttr = particlesRef.current.geometry.attributes.position;
    const colAttr = particlesRef.current.geometry.attributes.color;
    const angleRad = (angle * Math.PI) / 180;

    for (let i = 0; i < numParticles; i++) {
      const i3 = i * 3;
      let x = posAttr.array[i3];
      let y = posAttr.array[i3 + 1];

      // --- PHYSICS LOGIC ---
      // 1. Airfoil Influence (Bernoulli effect)
      const distToLeadingEdge = Math.sqrt(
        Math.pow(x + 0.5, 2) + Math.pow(y, 2)
      );
      let localVelocityFactor = 1.0;

      if (distToLeadingEdge < 2) {
        // Particles over the top (y > 0) accelerate
        // Particles below (y < 0) decelerate slightly
        const acceleration = y > 0 ? 0.4 : -0.2;
        localVelocityFactor += acceleration * Math.exp(-distToLeadingEdge);
      }

      // 2. Update Position
      x += velocity * delta * 0.5 * localVelocityFactor;

      // Simple lift-based deflection
      if (x > -0.5 && x < 2) {
        y += Math.sin(angleRad) * delta * 2;
      }

      // 3. Reset loop
      if (x > 5) {
        x = -5;
        y = data[i].yOffset;
      }

      // 4. Color Mapping (SolidWorks Style)
      // Map localVelocityFactor to a color (1.4 = Red, 0.8 = Blue)
      const normVel = (localVelocityFactor - 0.8) / 0.7;
      const c = getFlowColor(THREE.MathUtils.clamp(normVel, 0, 1));

      posAttr.array[i3] = x;
      posAttr.array[i3 + 1] = y;
      colAttr.array[i3] = c.r;
      colAttr.array[i3 + 1] = c.g;
      colAttr.array[i3 + 2] = c.b;
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={numParticles}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={numParticles}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.06} vertexColors transparent opacity={0.6} />
    </points>
  );
}

// STREAMLINES that react to angle of attack
function DynamicStreamlines({
  velocity,
  angle,
  active,
}: {
  velocity: number;
  angle: number;
  active: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const numLines = 10;

  useFrame((state, delta) => {
    if (!groupRef.current || !active) return;
    timeRef.current += delta * (velocity / 20);
  });

  // Regenerate streamlines when angle changes significantly
  const streamlineData = useMemo(() => {
    const lines = [];
    const angleRad = (angle * Math.PI) / 180;

    for (let i = 0; i < numLines; i++) {
      const baseY = (i / (numLines - 1)) * 3 - 1.5;
      const points: THREE.Vector3[] = [];
      const segments = 60;

      for (let j = 0; j < segments; j++) {
        const t = j / segments;
        const x = -5 + t * 11;

        // Flow deflection based on angle of attack
        let y = baseY;

        // Near airfoil (x: -0.5 to 1)
        if (x > -0.5 && x < 1) {
          const influence = Math.exp(-Math.abs(x - 0.25) * 2);

          // Upper flow accelerates, lower flow slows
          if (baseY > 0) {
            y += angleRad * influence * 2;
          } else {
            y -= angleRad * influence * 0.5;
          }

          // Add Bernoulli effect (flow curves around airfoil)
          y += Math.sin(t * Math.PI) * 0.2 * influence;
        }

        points.push(new THREE.Vector3(x, y, (Math.random() - 0.5) * 0.5));
      }

      lines.push({ points, color: i % 2 === 0 ? "#60a5fa" : "#3b82f6" });
    }

    return lines;
  }, [angle]); // Regenerate when angle changes

  return (
    <group ref={groupRef}>
      {streamlineData.map((line, i) => {
        const curve = new THREE.CatmullRomCurve3(line.points);
        const tubeGeometry = new THREE.TubeGeometry(curve, 50, 0.012, 8, false);

        return (
          <mesh key={i} geometry={tubeGeometry}>
            <meshBasicMaterial color={line.color} transparent opacity={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

// Simple placeholder for uploaded models
function UploadedModelPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[2, 0.3, 1]} />
      <meshStandardMaterial
        color="#8b5cf6"
        emissive="#6d28d9"
        emissiveIntensity={0.3}
        metalness={0.7}
        roughness={0.2}
      />
    </mesh>
  );
}

export default function ThreeJSViewer(props: ThreeJSViewerProps) {
  const controlsRef = useRef<any>(null);
  const sceneKey = useMemo(() => {
    return props.uploadedModel ? "uploaded-model" : "generated-geometry";
  }, [props.uploadedModel]);

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Simple Overlay Info */}
      <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg text-white text-sm font-mono border border-slate-700">
        <div className="flex items-center gap-3">
          <span className="text-cyan-400 font-semibold">V:</span>
          <span>{props.velocity} m/s</span>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-cyan-400 font-semibold">α:</span>
          <span>{props.angleOfAttack}°</span>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-600 text-xs text-gray-400">
          Drag to rotate • Scroll to zoom
        </div>
      </div>

      {/* Axis Labels */}
      <div className="absolute top-4 right-4 z-10 bg-black/60 backdrop-blur-md px-4 py-3 rounded-lg border border-slate-700">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-sm"></div>
            <span className="text-white font-medium">X (Flow)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-sm"></div>
            <span className="text-white font-medium">Y (Lift)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
            <span className="text-white font-medium">Z (Span)</span>
          </div>
        </div>
      </div>

      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera
          makeDefault
          position={[5, 3, 5]}
          fov={50}
          near={0.1}
          far={100}
        />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]} key={sceneKey}>
            {props.uploadedModel ? (
              <UploadedModelPlaceholder />
            ) : (
              <AirfoilExtrusion points={props.geometry} key={sceneKey} />
            )}
          </group>

          <Environment preset="night" />
        </Suspense>

        {/* DYNAMIC flow visualization */}
        <DynamicStreamlines
          velocity={props.velocity}
          angle={props.angleOfAttack}
          active={props.isAnimating}
        />

        <AnimatedFlowParticles
          velocity={props.velocity}
          angle={props.angleOfAttack}
          active={props.isAnimating}
          geometry={props.geometry}
        />

        <Grid
          infiniteGrid
          fadeDistance={30}
          sectionColor="#334155"
          cellColor="#1e293b"
          sectionSize={1}
          sectionThickness={1}
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={15}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.1}
          target={[0, 0, 0]}
        />

        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={0.8} color="#ffffff" />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.3}
          color="#4a5568"
        />
      </Canvas>
    </div>
  );
}

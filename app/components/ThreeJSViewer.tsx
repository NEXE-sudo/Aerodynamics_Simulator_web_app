"use client";

import React, { Suspense, useMemo, useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  GizmoHelper,
  GizmoViewport,
  Grid,
  Environment,
  PerspectiveCamera,
  OrthographicCamera,
  Float,
} from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Point, UploadedModel } from "../types";

interface ThreeJSViewerProps {
  geometry: Point[];
  uploadedModel: UploadedModel | null;
  velocity: number;
  angleOfAttack: number;
  isAnimating: boolean;
}

// 1. MODEL RENDERER WITH VIBRANT MATERIALS
function ModelRenderer({ model }: { model: UploadedModel }) {
  const url = useMemo(() => URL.createObjectURL(model.file), [model]);
  const loaderType = useMemo(() => {
    if (model.type.toLowerCase().includes("stl")) return STLLoader;
    if (model.type.toLowerCase().includes("obj")) return OBJLoader;
    return GLTFLoader;
  }, [model]);

  const result = useLoader(loaderType as any, url);
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (result) {
      const obj = (result as any).scene || result;
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 1.5 / maxDim;

      obj.scale.setScalar(scale);
      obj.position.sub(center.multiplyScalar(scale)); // Center the model
    }
  }, [result]);

  return <primitive object={(result as any).scene || result} />;
}

// 2. VIBRANT FALLBACK AIRFOIL
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
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh rotation={[0, 0, 0]}>
        <extrudeGeometry args={[shape, { depth: 1, bevelEnabled: false }]} />
        <meshStandardMaterial
          color="#3b82f6" // Electric Blue
          emissive="#1d4ed8"
          emissiveIntensity={0.5}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </Float>
  );
}

// 3. GLOWING AERODYNAMIC FLOW
function AnimatedFlowLines({
  velocity,
  angle,
  active,
}: {
  velocity: number;
  angle: number;
  active: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const count = 50;

  const lines = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        y: (i / count) * 8 - 4,
        z: (Math.random() - 0.5) * 3,
        speed: 0.8 + Math.random() * 0.4,
        color: i % 3 === 0 ? "#60a5fa" : i % 3 === 1 ? "#34d399" : "#fbbf24", // Mixed colors (Blue, Green, Amber)
      })),
    []
  );

  useFrame((state, delta) => {
    if (!groupRef.current || !active) return;
    groupRef.current.children.forEach((line, i) => {
      const s = (velocity / 15) * lines[i].speed;
      line.position.x += s * delta * 5;
      if (line.position.x > 8) line.position.x = -8;
    });
  });

  return (
    <group ref={groupRef} rotation={[0, 0, (angle * Math.PI) / 180]}>
      {lines.map((l, i) => (
        <mesh
          key={i}
          position={[Math.random() * 10 - 5, l.y, l.z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <capsuleGeometry args={[0.015, 0.6, 4, 8]} />
          <meshBasicMaterial color={l.color} transparent opacity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function ThreeJSViewer(props: ThreeJSViewerProps) {
  const [view, setView] = useState<"3D" | "2D">("3D");

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* HUD UI */}
      <div className="absolute top-6 left-6 z-10 flex gap-3">
        <button
          onClick={() => setView(view === "3D" ? "2D" : "3D")}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-full shadow-lg transition-all transform active:scale-95"
        >
          {view === "3D" ? "📐 SNAP TO 2D" : "📦 SWITCH TO 3D"}
        </button>
      </div>

      <Canvas shadows dpr={[1, 2]}>
        {view === "3D" ? (
          <PerspectiveCamera makeDefault position={[6, 4, 6]} fov={45} />
        ) : (
          <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={100} />
        )}

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            {props.uploadedModel ? (
              <ModelRenderer model={props.uploadedModel} />
            ) : (
              <AirfoilExtrusion points={props.geometry} />
            )}
          </group>
          {/* Environment adds reflection/color to metals */}
          <Environment preset="night" />
        </Suspense>

        <AnimatedFlowLines
          velocity={props.velocity}
          angle={props.angleOfAttack}
          active={props.isAnimating}
        />

        {/* Colorful Grid */}
        <Grid
          infiniteGrid
          fadeDistance={40}
          sectionColor="#334155"
          cellColor="#1e293b"
          sectionSize={1}
          sectionThickness={1.5}
        />

        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        {/* Blender Gizmo with custom labels */}
        <GizmoHelper alignment="top-right" margin={[80, 80]}>
          <GizmoViewport
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="white"
          />
        </GizmoHelper>

        {/* Ambient light for general visibility */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
      </Canvas>
    </div>
  );
}

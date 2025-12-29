/**
 * ThreeJSViewer.tsx
 * =================
 * Main Three.js canvas setup - particle-only visualization.
 *
 * Changes:
 * - Removed streamline generation and rendering
 * - Simplified to single FlowRenderer component
 * - Cleaner scene composition
 */

"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Environment,
  PerspectiveCamera,
} from "@react-three/drei";
import { Point, UploadedModel } from "../types";
import { FlowSimulation } from "../lib/simulation/FlowSimulation";
import ModelRenderer from "../components/ModelRenderer";
import FlowRenderer from "./FlowRenderer";

interface ThreeJSViewerProps {
  geometry: Point[];
  uploadedModel: UploadedModel | null;
  velocity: number;
  angleOfAttack: number;
  isAnimating: boolean;
}

export default function ThreeJSViewer(props: ThreeJSViewerProps) {
  // Create simulation instance (memoized to prevent recreation)
  const simulation = useMemo(
    () =>
      new FlowSimulation(
        props.geometry,
        500, // Particle count
        props.velocity,
        props.angleOfAttack
      ),
    [props.geometry, props.velocity, props.angleOfAttack]
  );

  return (
    <div className="w-full h-full relative bg-slate-950 rounded-xl border border-slate-800">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[5, 3, 5]} fov={45} />

        <Suspense fallback={null}>
          {/* Airfoil geometry */}
          <ModelRenderer
            geometry={props.geometry}
            uploadedModel={props.uploadedModel}
          />

          {/* Particle-only flow visualization */}
          <FlowRenderer
            simulation={simulation}
            isAnimating={props.isAnimating}
          />

          {/* Scene environment */}
          <Environment preset="night" />
        </Suspense>

        {/* Grid for spatial reference */}
        <Grid infiniteGrid sectionColor="#334155" cellColor="#1e293b" />

        {/* Camera controls */}
        <OrbitControls makeDefault enableDamping dampingFactor={0.05} />

        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
      </Canvas>
    </div>
  );
}

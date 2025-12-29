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
  const simulation = useMemo(
    () =>
      new FlowSimulation(
        props.geometry,
        500,
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
          <ModelRenderer
            geometry={props.geometry}
            uploadedModel={props.uploadedModel}
          />
          <FlowRenderer
            simulation={simulation}
            isAnimating={props.isAnimating}
          />
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

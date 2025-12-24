"use client";

import React, { useEffect, useRef, useState } from "react";
import { Point, UploadedModel } from "../types";
import { ParticleSystem, Particle } from "../lib/visualization/particles";
import { useTheme } from "../providers/ThemeProvider";

type ProjectionFace =
  | "xy-top"
  | "xy-bottom"
  | "xz-front"
  | "xz-back"
  | "yz-left"
  | "yz-right";

interface VisualizationCanvasProps {
  geometry: Point[];
  streamlines: Point[][];
  pressureField: number[];
  isAnimating: boolean;
  showStreamlines: boolean;
  angleOfAttack: number;
  velocity: number;
  particleSystem: ParticleSystem | null;
  uploadedModel?: UploadedModel | null;
  projectionPlane?: "xy" | "xz" | "yz";
  onProjectionChange?: (plane: "xy" | "xz" | "yz") => void;
}

export default function VisualizationCanvas({
  geometry,
  streamlines,
  pressureField,
  isAnimating,
  showStreamlines,
  angleOfAttack,
  velocity,
  particleSystem,
  uploadedModel = null,
  projectionPlane = "xy",
  onProjectionChange,
}: VisualizationCanvasProps) {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

  // Store 2D projection of uploaded model
  const [projectionFace, setProjectionFace] =
    useState<ProjectionFace>("xy-top");

  const [projected2DPoints, setProjected2DPoints] = useState<Point[]>([]);

  const projectPoint3DTo2D = (
    point: { x: number; y: number; z?: number },
    face: ProjectionFace
  ): Point => {
    const z = point.z || 0;

    switch (face) {
      case "xy-top": // Looking down (positive Z)
        return { x: point.x, y: point.y };
      case "xy-bottom": // Looking up (negative Z)
        return { x: -point.x, y: point.y };
      case "xz-front": // Looking from front (positive Y)
        return { x: point.x, y: z };
      case "xz-back": // Looking from back (negative Y)
        return { x: -point.x, y: z };
      case "yz-left": // Looking from left (positive X)
        return { x: point.y, y: z };
      case "yz-right": // Looking from right (negative X)
        return { x: -point.y, y: z };
      default:
        return { x: point.x, y: point.y };
    }
  };

  // Project 3D model to 2D when model or projection changes
  useEffect(() => {
    if (!uploadedModel) {
      setProjected2DPoints([]);
      return;
    }

    // Read and project the 3D model file
    const reader = new FileReader();
    reader.onload = (e) => {
      if (!e.target?.result) return;

      if (uploadedModel.type === ".obj") {
        const text = new TextDecoder().decode(e.target.result as ArrayBuffer);
        const lines = text.split("\n");
        const vertices: { x: number; y: number; z: number }[] = [];

        // Parse vertices
        lines.forEach((line) => {
          const parts = line.trim().split(/\s+/);
          if (parts[0] === "v") {
            vertices.push({
              x: parseFloat(parts[1]),
              y: parseFloat(parts[2]),
              z: parseFloat(parts[3]),
            });
          }
        });

        // Project to 2D based on selected face
        const projectedPoints: Point[] = vertices.map((v) =>
          projectPoint3DTo2D(v, projectionFace)
        );

        // Normalize to [0, 1] range for canvas
        if (projectedPoints.length > 0) {
          const xs = projectedPoints.map((p) => p.x);
          const ys = projectedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const rangeX = maxX - minX || 1;
          const rangeY = maxY - minY || 1;

          const normalized = projectedPoints.map((p) => ({
            x: (p.x - minX) / rangeX,
            y: (p.y - minY) / rangeY - 0.5,
          }));

          setProjected2DPoints(normalized);
        }
      } else if (uploadedModel.type === ".stl") {
        // Similar STL parsing
        const data = new DataView(e.target.result as ArrayBuffer);
        const triangles = data.getUint32(80, true);
        const vertices: { x: number; y: number; z: number }[] = [];

        let offset = 84;
        for (let i = 0; i < triangles; i++) {
          offset += 12; // Skip normal
          for (let j = 0; j < 3; j++) {
            vertices.push({
              x: data.getFloat32(offset, true),
              y: data.getFloat32(offset + 4, true),
              z: data.getFloat32(offset + 8, true),
            });
            offset += 12;
          }
          offset += 2;
        }

        // Project and normalize
        const projectedPoints: Point[] = vertices.map((v) =>
          projectPoint3DTo2D(v, projectionFace)
        );

        if (projectedPoints.length > 0) {
          const xs = projectedPoints.map((p) => p.x);
          const ys = projectedPoints.map((p) => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const rangeX = maxX - minX || 1;
          const rangeY = maxY - minY || 1;

          const normalized = projectedPoints.map((p) => ({
            x: (p.x - minX) / rangeX,
            y: (p.y - minY) / rangeY - 0.5,
          }));

          setProjected2DPoints(normalized);
        }
      }
    };

    reader.readAsArrayBuffer(uploadedModel.file);
  }, [uploadedModel, projectionFace]);

  // Animation loop for streamline particles
  useEffect(() => {
    if (!canvasRef.current || !geometry || geometry.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const updateCanvasSize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    updateCanvasSize();

    // Scale parameters
    const padding = 60;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const availableWidth = canvasWidth - 2 * padding;
    const availableHeight = canvasHeight - 2 * padding;

    // Draw function
    const draw = () => {
      // Clear canvas with theme-aware gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      if (isDark) {
        gradient.addColorStop(0, "#1f2937");
        gradient.addColorStop(1, "#111827");
      } else {
        gradient.addColorStop(0, "#f3f4f6");
        gradient.addColorStop(1, "#e5e7eb");
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw pressure field heatmap behind geometry
      if (pressureField && pressureField.length > 0) {
        drawPressureField(ctx, geometry, pressureField, padding);
      }

      // Draw streamlines
      if (showStreamlines && streamlines && streamlines.length > 0) {
        drawStreamlines(
          ctx,
          streamlines,
          padding,
          isAnimating && timeRef.current
        );
      }

      // Draw particles if particle system exists
      if (particleSystem && isAnimating) {
        const particles = particleSystem.getParticles();
        drawParticles(ctx, particles, padding, availableWidth, availableHeight);
      }

      // Draw coordinate axes
      drawAxes(ctx, padding, availableWidth, availableHeight);

      // Draw airfoil geometry OR uploaded model projection
      if (uploadedModel && projected2DPoints.length > 0) {
        drawUploadedModel(
          ctx,
          projected2DPoints,
          padding,
          availableWidth,
          availableHeight
        );
      } else {
        drawAirfoil(ctx, geometry, padding, availableWidth, availableHeight);
      }

      // Draw flow direction arrow - velocity scaled proportionally
      const arrowLength = 30 + (velocity / 80) * 40; // Scale arrow with velocity
      drawFlowArrow(
        ctx,
        padding,
        canvasHeight / 2,
        arrowLength,
        angleOfAttack,
        velocity
      );

      // Update time and particle system
      if (isAnimating) {
        const now = Date.now();
        const dt = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        timeRef.current += dt;

        if (particleSystem) {
          particleSystem.update(dt, velocity, angleOfAttack);
        }
      }
    };

    const drawParticles = (
      ctx: CanvasRenderingContext2D,
      particles: Particle[],
      padding: number,
      width: number,
      height: number
    ) => {
      particles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 3;
        ctx.beginPath();
        ctx.arc(
          padding + p.x * width,
          padding + height / 2 - p.y * height * 2,
          3,
          0,
          Math.PI * 2
        );
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    };

    const animate = () => {
      draw();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      updateCanvasSize();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    geometry,
    streamlines,
    pressureField,
    isAnimating,
    showStreamlines,
    angleOfAttack,
    velocity,
    particleSystem,
    isDark,
  ]);

  const drawAirfoil = (
    ctx: CanvasRenderingContext2D,
    geometry: Point[],
    padding: number,
    width: number,
    height: number
  ) => {
    if (geometry.length === 0) return;

    // Project geometry based on current face
    const projectedGeometry = geometry.map((p) => {
      const point3D = { x: p.x, y: p.y, z: 0 };
      return projectPoint3DTo2D(point3D, projectionFace);
    });

    // Scale geometry to canvas
    const points = projectedGeometry.map((p) => ({
      x: padding + p.x * width,
      y: padding + height / 2 - p.y * height * 2,
    }));

    // Draw airfoil body with gradient
    const gradient = ctx.createLinearGradient(
      points[0].x,
      points[0].y,
      points[points.length - 1].x,
      points[points.length - 1].y
    );
    gradient.addColorStop(0, "#0ea5e9");
    gradient.addColorStop(0.5, "#06b6d4");
    gradient.addColorStop(1, "#0891b2");

    ctx.fillStyle = gradient;
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw airfoil outline highlight
    ctx.strokeStyle = "#e0f2fe";
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawUploadedModel = (
    ctx: CanvasRenderingContext2D,
    points: Point[],
    padding: number,
    width: number,
    height: number
  ) => {
    if (points.length === 0) return;

    // Scale points to canvas (points are already projected)
    const scaledPoints = points.map((p) => ({
      x: padding + p.x * width,
      y: padding + height / 2 - p.y * height * 2,
    }));

    // Draw as point cloud or wireframe
    ctx.strokeStyle = "#0891b2";
    ctx.fillStyle = "#06b6d4";
    ctx.lineWidth = 1;

    // Draw points
    scaledPoints.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();

      // Connect consecutive points (simple wireframe)
      if (i > 0 && i % 3 === 0) {
        const prev = scaledPoints[i - 1];
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    });

    // Draw outline
    ctx.strokeStyle = "#0369a1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    scaledPoints.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  };

  const drawStreamlines = (
    ctx: CanvasRenderingContext2D,
    streamlines: Point[][],
    padding: number,
    time: number
  ) => {
    const width = ctx.canvas.width - 2 * padding;
    const height = ctx.canvas.height - 2 * padding;

    // Import the CFD solver for colors
    const { CFDFlowSolver } = require("../lib/physics/cfd-simple");

    // Get streamlines with speed data
    const streamlinesData =
      require("../lib/visualization/flow-field").FlowField.generateStreamlinesWithData(
        geometry,
        velocity,
        angleOfAttack,
        streamlines.length
      );

    streamlinesData.forEach((lineData: any, idx: number) => {
      const line = lineData.points;
      const speeds = lineData.speeds;

      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Draw line segments with varying colors based on speed
      for (let i = 0; i < line.length - 1; i++) {
        const p1 = line[i];
        const p2 = line[i + 1];

        const x1 = padding + p1.x * width;
        const y1 = padding + height / 2 - p1.y * height * 2;
        const x2 = padding + p2.x * width;
        const y2 = padding + height / 2 - p2.y * height * 2;

        // Get color based on local speed
        const speed = speeds[i] || velocity;
        const pressure = lineData.pressures[i] || 0;
        const color = CFDFlowSolver.getFlowLineColor(speed, pressure, velocity);

        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Animated particle on streamline
      if (line.length > 2) {
        const speedFactor = velocity / 20;
        const particleIndex = Math.floor(
          (time * 2 * speedFactor) % line.length
        );
        const particle = line[particleIndex];
        const px = padding + particle.x * width;
        const py = padding + height / 2 - particle.y * height * 2;

        const speed = speeds[particleIndex] || velocity;
        const pressure = lineData.pressures[particleIndex] || 0;
        const color = CFDFlowSolver.getFlowLineColor(speed, pressure, velocity);

        ctx.fillStyle = color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  };

  const drawPressureField = (
    ctx: CanvasRenderingContext2D,
    geometry: Point[],
    pressureField: number[],
    padding: number
  ) => {
    const width = ctx.canvas.width - 2 * padding;
    const height = ctx.canvas.height - 2 * padding;

    if (pressureField.length === 0) return;

    // Find min/max pressure for normalization
    const minPressure = Math.min(...pressureField);
    const maxPressure = Math.max(...pressureField);
    const pressureRange = maxPressure - minPressure || 1;

    // Draw pressure field around geometry
    geometry.forEach((point, idx) => {
      if (pressureField[idx] === undefined) return;

      const normalized = (pressureField[idx] - minPressure) / pressureRange;

      // Color mapping: Blue = low pressure (faster flow), Red = high pressure (slower flow)
      let color: string;
      if (normalized > 0.5) {
        // High pressure - Red/Orange
        const t = (normalized - 0.5) * 2;
        color = `rgba(${Math.floor(220 + 35 * t)}, ${Math.floor(
          50 + 100 * (1 - t)
        )}, 50, ${0.3 + t * 0.3})`;
      } else {
        // Low pressure - Blue/Cyan
        const t = normalized * 2;
        color = `rgba(50, ${Math.floor(150 + 80 * t)}, ${Math.floor(
          220 + 35 * (1 - t)
        )}, ${0.3 + (1 - t) * 0.3})`;
      }

      ctx.fillStyle = color;
      const x = padding + point.x * width;
      const y = padding + height / 2 - point.y * height * 2;

      // Size based on pressure magnitude
      const radius = 3 + Math.abs(normalized - 0.5) * 4;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    padding: number,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = isDark ? "#4b5563" : "#9ca3af";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    // Horizontal axis (x-axis)
    ctx.beginPath();
    ctx.moveTo(padding, padding + height / 2);
    ctx.lineTo(padding + width, padding + height / 2);
    ctx.stroke();

    // Vertical axis
    ctx.beginPath();
    ctx.moveTo(padding + width / 2, padding);
    ctx.lineTo(padding + width / 2, padding + height);
    ctx.stroke();

    ctx.setLineDash([]);

    // Labels - theme aware
    ctx.fillStyle = isDark ? "#9ca3af" : "#6b7280";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Chord", padding + width / 2, padding + height + 20);
    ctx.textAlign = "right";
    ctx.fillText("Camber", padding - 10, padding + 15);
  };

  const drawFlowArrow = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    length: number,
    angle: number,
    velocity: number
  ) => {
    const angleRad = (angle * Math.PI) / 180;
    const endX = x + length * Math.cos(angleRad);
    const endY = y - length * Math.sin(angleRad);

    // Arrow line
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Arrow head
    const headLen = 10;
    const angle1 = angleRad + (Math.PI * 5) / 6;
    const angle2 = angleRad - (Math.PI * 5) / 6;

    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLen * Math.cos(angle1),
      endY + headLen * Math.sin(angle1)
    );
    ctx.lineTo(
      endX - headLen * Math.cos(angle2),
      endY + headLen * Math.sin(angle2)
    );
    ctx.closePath();
    ctx.fillStyle = "#f97316";
    ctx.fill();

    // Label
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`V = ${velocity.toFixed(0)} m/s`, endX, y - 15);
    if (angle !== 0) {
      ctx.fillText(`α = ${angle.toFixed(1)}°`, endX, y + 15);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Title Bar */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Flow Visualization
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          2D Streamline and Pressure Field Analysis
        </p>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: "block" }}
        />

        {/* Enhanced Projection Face Selector */}
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-gray-800 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            View Face
          </div>

          {/* XY Plane Views */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              XY Plane
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setProjectionFace("xy-top")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "xy-top"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Top view (+Z)"
              >
                Top
              </button>
              <button
                onClick={() => setProjectionFace("xy-bottom")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "xy-bottom"
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Bottom view (-Z)"
              >
                Bot
              </button>
            </div>
          </div>

          {/* XZ Plane Views */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              XZ Plane
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setProjectionFace("xz-front")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "xz-front"
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Front view (+Y)"
              >
                Front
              </button>
              <button
                onClick={() => setProjectionFace("xz-back")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "xz-back"
                    ? "bg-green-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Back view (-Y)"
              >
                Back
              </button>
            </div>
          </div>

          {/* YZ Plane Views */}
          <div className="mb-2">
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              YZ Plane
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setProjectionFace("yz-left")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "yz-left"
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Left view (+X)"
              >
                Left
              </button>
              <button
                onClick={() => setProjectionFace("yz-right")}
                className={`px-2 py-1 rounded text-xs font-medium transition ${
                  projectionFace === "yz-right"
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
                title="Right view (-X)"
              >
                Right
              </button>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 text-xs text-gray-600 dark:text-gray-400">
            {projectionFace === "xy-top" && "↓ Top: Width × Height"}
            {projectionFace === "xy-bottom" && "↑ Bottom: Width × Height"}
            {projectionFace === "xz-front" && "← Front: Width × Depth"}
            {projectionFace === "xz-back" && "→ Back: Width × Depth"}
            {projectionFace === "yz-left" && "← Left: Height × Depth"}
            {projectionFace === "yz-right" && "→ Right: Height × Depth"}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-xs">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Legend
          </div>
          <div className="space-y-1 text-gray-700 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>
                {uploadedModel ? "Uploaded Model" : "Airfoil Geometry"}
              </span>
            </div>
            {uploadedModel && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Projection: {projectionPlane.toUpperCase()} plane
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-orange-500"></div>
              <span>Flow Direction</span>
            </div>
            {showStreamlines && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                <span>Streamlines</span>
              </div>
            )}
            {particleSystem && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                <span>Flow Particles</span>
              </div>
            )}
            {projectionPlane !== "xy" && (
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div className="text-xs font-semibold text-teal-600 dark:text-teal-400">
                  📐 Projection: {projectionPlane.toUpperCase()} Plane
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {projectionPlane === "xz" && "Front view (X vs Z)"}
                  {projectionPlane === "yz" && "Side view (Y vs Z)"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 bg-opacity-90 dark:bg-opacity-90 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-xs text-gray-700 dark:text-gray-300">
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            Canvas Stats
          </div>
          <div className="space-y-0.5">
            <div>Points: {geometry.length}</div>
            <div>Streamlines: {streamlines.length}</div>
            {particleSystem && (
              <div>Particles: {particleSystem.getParticles().length}</div>
            )}
            {isAnimating && (
              <div className="text-orange-600 font-medium">● Animating</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

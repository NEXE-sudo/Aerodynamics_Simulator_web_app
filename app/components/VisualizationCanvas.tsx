"use client";

import React, { useEffect, useRef } from "react";
import { Point } from "../types";
import { ParticleSystem, Particle } from "../lib/visualization/particles";

interface VisualizationCanvasProps {
  geometry: Point[];
  streamlines: Point[][];
  pressureField: number[];
  isAnimating: boolean;
  showStreamlines: boolean;
  angleOfAttack: number;
  velocity: number;
  particleSystem: ParticleSystem | null;
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
}: VisualizationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastTimeRef = useRef(Date.now());

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
      // Clear canvas with gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      gradient.addColorStop(0, "#f3f4f6");
      gradient.addColorStop(1, "#e5e7eb");
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

      // Draw airfoil geometry with gradient
      drawAirfoil(ctx, geometry, padding, availableWidth, availableHeight);

      // Draw flow direction arrow
      drawFlowArrow(
        ctx,
        padding,
        canvasHeight / 2,
        30,
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
  ]);

  const drawAirfoil = (
    ctx: CanvasRenderingContext2D,
    geometry: Point[],
    padding: number,
    width: number,
    height: number
  ) => {
    if (geometry.length === 0) return;

    // Scale geometry to canvas
    const points = geometry.map((p) => ({
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

  const drawStreamlines = (
    ctx: CanvasRenderingContext2D,
    streamlines: Point[][],
    padding: number,
    time: number
  ) => {
    const width = ctx.canvas.width - 2 * padding;
    const height = ctx.canvas.height - 2 * padding;

    streamlines.forEach((line, idx) => {
      // Color based on streamline index (rainbow effect)
      const hue = (idx / Math.max(1, streamlines.length - 1)) * 360;
      const color = `hsla(${hue}, 70%, 50%, 0.6)`;

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      let started = false;

      for (let i = 0; i < line.length; i++) {
        const p = line[i];
        const x = padding + p.x * width;
        const y = padding + height / 2 - p.y * height * 2;

        if (i === 0 || Math.abs(x - (started ? padding : 0)) > width * 2) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Draw animated particles on streamlines
      if (line.length > 2) {
        const particleIndex = Math.floor((time * 2) % line.length);
        const particle = line[particleIndex];
        const px = padding + particle.x * width;
        const py = padding + height / 2 - particle.y * height * 2;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();

        // Particle trail
        ctx.globalAlpha = 0.3;
        for (let i = Math.max(0, particleIndex - 5); i < particleIndex; i++) {
          const trailParticle = line[i];
          const trailX = padding + trailParticle.x * width;
          const trailY = padding + height / 2 - trailParticle.y * height * 2;
          const trailAlpha = (i - Math.max(0, particleIndex - 5)) / 5;

          ctx.globalAlpha = 0.3 * trailAlpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(trailX, trailY, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
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

      // Red for high pressure, blue for low pressure
      let color: string;
      if (normalized > 0.5) {
        // Red side
        const t = (normalized - 0.5) * 2;
        color = `rgba(255, ${Math.floor(150 * (1 - t))}, ${Math.floor(
          100 * (1 - t)
        )}, 0.15)`;
      } else {
        // Blue side
        const t = normalized * 2;
        color = `rgba(${Math.floor(100 * (1 - t))}, ${Math.floor(
          150 * (1 - t)
        )}, 255, 0.15)`;
      }

      ctx.fillStyle = color;
      const x = padding + point.x * width;
      const y = padding + height / 2 - point.y * height * 2;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawAxes = (
    ctx: CanvasRenderingContext2D,
    padding: number,
    width: number,
    height: number
  ) => {
    ctx.strokeStyle = "#9ca3af";
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

    // Labels
    ctx.fillStyle = "#6b7280";
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
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Flow Visualization</h3>
        <p className="text-xs text-gray-600 mt-1">
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

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 rounded-lg p-3 border border-gray-200 text-xs">
          <div className="font-semibold text-gray-900 mb-2">Legend</div>
          <div className="space-y-1 text-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Airfoil Geometry</span>
            </div>
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
          </div>
        </div>

        {/* Info Box */}
        <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 border border-gray-200 text-xs text-gray-700">
          <div className="font-semibold text-gray-900 mb-1">Canvas Stats</div>
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

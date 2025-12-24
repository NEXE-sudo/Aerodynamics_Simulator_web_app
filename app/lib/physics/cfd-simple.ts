/**
 * Simplified CFD for Flow Visualization
 * Uses potential flow with circulation for more accurate streamlines
 */

import { Point } from "../../types";

export interface FlowPoint {
  x: number;
  y: number;
  vx: number; // Velocity x-component
  vy: number; // Velocity y-component
  pressure: number; // Pressure coefficient
  speed: number; // Magnitude of velocity
}

export class CFDFlowSolver {
  /**
   * Calculate potential flow around a cylinder with circulation (Kutta-Joukowski)
   * This approximates flow around an airfoil
   */
  static calculateVelocityField(
    geometry: Point[],
    freeStreamVelocity: number,
    angleOfAttack: number,
    gridResolution: number = 50
  ): FlowPoint[] {
    const flowField: FlowPoint[] = [];
    const alpha = (angleOfAttack * Math.PI) / 180;

    // Estimate circulation from angle of attack (Kutta condition approximation)
    const circulation = 4 * Math.PI * freeStreamVelocity * Math.sin(alpha);

    // Calculate bounding box of geometry
    const minX = Math.min(...geometry.map((p) => p.x));
    const maxX = Math.max(...geometry.map((p) => p.x));
    const minY = Math.min(...geometry.map((p) => p.y));
    const maxY = Math.max(...geometry.map((p) => p.y));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const radius = Math.max(maxX - minX, maxY - minY) / 2;

    // Free stream components
    const u_inf = freeStreamVelocity * Math.cos(alpha);
    const v_inf = freeStreamVelocity * Math.sin(alpha);

    // Generate flow field grid
    for (let i = 0; i < gridResolution; i++) {
      for (let j = 0; j < gridResolution; j++) {
        const x = minX - 0.5 + (i / gridResolution) * (maxX - minX + 1);
        const y = minY - 0.3 + (j / gridResolution) * (maxY - minY + 0.6);

        // Distance from center
        const dx = x - centerX;
        const dy = y - centerY;
        const r = Math.sqrt(dx * dx + dy * dy);

        // Skip points inside the body
        if (this.isInsideGeometry(x, y, geometry)) continue;

        // Avoid singularity at center
        if (r < radius * 0.1) continue;

        // Potential flow velocity components:
        // u = U_inf(1 - R²/r²cos(2θ)) + Γ/(2πr)sin(θ)
        // v = -U_inf(R²/r²sin(2θ)) + Γ/(2πr)cos(θ)

        const theta = Math.atan2(dy, dx);
        const R2_r2 = (radius * radius) / (r * r);

        // Uniform flow + Doublet (cylinder) + Vortex (circulation)
        const u =
          u_inf * (1 - R2_r2 * Math.cos(2 * theta)) +
          (circulation / (2 * Math.PI * r)) * Math.sin(theta);
        const v =
          -u_inf * R2_r2 * Math.sin(2 * theta) +
          (circulation / (2 * Math.PI * r)) * Math.cos(theta);

        const speed = Math.sqrt(u * u + v * v);

        // Bernoulli equation for pressure coefficient
        // Cp = 1 - (V/V_inf)²
        const pressureCoeff = 1 - (speed / freeStreamVelocity) ** 2;

        flowField.push({
          x,
          y,
          vx: u,
          vy: v,
          speed,
          pressure: pressureCoeff,
        });
      }
    }

    return flowField;
  }

  /**
   * Generate streamlines from velocity field using RK4 integration
   */
  static generateStreamlines(
    flowField: FlowPoint[],
    freeStreamVelocity: number,
    angleOfAttack: number,
    geometry: Point[],
    numLines: number = 15
  ): { points: Point[]; speeds: number[]; pressures: number[] }[] {
    const streamlines: {
      points: Point[];
      speeds: number[];
      pressures: number[];
    }[] = [];
    const alpha = (angleOfAttack * Math.PI) / 180;

    // Starting points for streamlines
    const startY = -0.4;
    const endY = 0.4;
    const spacing = (endY - startY) / (numLines - 1);

    for (let i = 0; i < numLines; i++) {
      const y0 = startY + i * spacing;
      const streamline = this.integrateStreamline(
        { x: -0.6, y: y0 },
        flowField,
        freeStreamVelocity,
        angleOfAttack,
        geometry,
        200 // max steps
      );

      if (streamline.points.length > 5) {
        streamlines.push(streamline);
      }
    }

    return streamlines;
  }

  /**
   * Integrate streamline using RK4 method
   */
  private static integrateStreamline(
    start: Point,
    flowField: FlowPoint[],
    freeStreamVelocity: number,
    angleOfAttack: number,
    geometry: Point[],
    maxSteps: number
  ): { points: Point[]; speeds: number[]; pressures: number[] } {
    const points: Point[] = [start];
    const speeds: number[] = [];
    const pressures: number[] = [];

    let current = { ...start };
    const dt = 0.01; // Time step
    const alpha = (angleOfAttack * Math.PI) / 180;

    for (let step = 0; step < maxSteps; step++) {
      // Get velocity at current point
      const velocity = this.interpolateVelocity(
        current,
        flowField,
        freeStreamVelocity,
        alpha
      );

      if (!velocity) break;

      speeds.push(velocity.speed);
      pressures.push(velocity.pressure);

      // Check if inside geometry
      if (this.isInsideGeometry(current.x, current.y, geometry)) break;

      // RK4 integration
      const k1 = { vx: velocity.vx, vy: velocity.vy };

      const mid1 = {
        x: current.x + 0.5 * dt * k1.vx,
        y: current.y + 0.5 * dt * k1.vy,
      };
      const v2 = this.interpolateVelocity(
        mid1,
        flowField,
        freeStreamVelocity,
        alpha
      );
      if (!v2) break;
      const k2 = { vx: v2.vx, vy: v2.vy };

      const mid2 = {
        x: current.x + 0.5 * dt * k2.vx,
        y: current.y + 0.5 * dt * k2.vy,
      };
      const v3 = this.interpolateVelocity(
        mid2,
        flowField,
        freeStreamVelocity,
        alpha
      );
      if (!v3) break;
      const k3 = { vx: v3.vx, vy: v3.vy };

      const end = {
        x: current.x + dt * k3.vx,
        y: current.y + dt * k3.vy,
      };
      const v4 = this.interpolateVelocity(
        end,
        flowField,
        freeStreamVelocity,
        alpha
      );
      if (!v4) break;
      const k4 = { vx: v4.vx, vy: v4.vy };

      // Update position
      current.x += (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx);
      current.y += (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy);

      points.push({ ...current });

      // Stop if out of bounds
      if (current.x > 1.5 || current.x < -0.7 || Math.abs(current.y) > 0.6)
        break;
    }

    return { points, speeds, pressures };
  }

  /**
   * Interpolate velocity at a point using nearest neighbors
   */
  private static interpolateVelocity(
    point: Point,
    flowField: FlowPoint[],
    freeStreamVelocity: number,
    alpha: number
  ): FlowPoint | null {
    // Find nearest points
    const nearest = flowField
      .map((fp) => ({
        ...fp,
        dist: Math.sqrt((fp.x - point.x) ** 2 + (fp.y - point.y) ** 2),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4); // Use 4 nearest points

    if (nearest.length === 0) {
      // Return free stream if no nearby points
      return {
        x: point.x,
        y: point.y,
        vx: freeStreamVelocity * Math.cos(alpha),
        vy: freeStreamVelocity * Math.sin(alpha),
        speed: freeStreamVelocity,
        pressure: 0,
      };
    }

    // Inverse distance weighting
    const totalWeight = nearest.reduce(
      (sum, p) => sum + 1 / (p.dist + 0.001),
      0
    );

    let vx = 0,
      vy = 0,
      pressure = 0;
    nearest.forEach((p) => {
      const weight = 1 / (p.dist + 0.001) / totalWeight;
      vx += p.vx * weight;
      vy += p.vy * weight;
      pressure += p.pressure * weight;
    });

    const speed = Math.sqrt(vx * vx + vy * vy);

    return {
      x: point.x,
      y: point.y,
      vx,
      vy,
      speed,
      pressure,
    };
  }

  /**
   * Check if point is inside geometry
   */
  private static isInsideGeometry(
    x: number,
    y: number,
    geometry: Point[]
  ): boolean {
    let inside = false;
    for (let i = 0, j = geometry.length - 1; i < geometry.length; j = i++) {
      const xi = geometry[i].x,
        yi = geometry[i].y;
      const xj = geometry[j].x,
        yj = geometry[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Get color for flow line based on speed and pressure
   */
  static getFlowLineColor(
    speed: number,
    pressure: number,
    freeStreamVelocity: number
  ): string {
    // Normalize speed (0 to 2x free stream)
    const speedRatio = Math.min(speed / freeStreamVelocity, 2);

    // Color scheme:
    // Blue (slow, high pressure) -> Cyan -> Green -> Yellow -> Red (fast, low pressure)
    let hue: number;
    if (speedRatio < 0.8) {
      // Blue to cyan (high pressure region)
      hue = 210 - (speedRatio / 0.8) * 30; // 210 to 180
    } else if (speedRatio < 1.2) {
      // Cyan to green (around free stream)
      hue = 180 - ((speedRatio - 0.8) / 0.4) * 60; // 180 to 120
    } else if (speedRatio < 1.5) {
      // Green to yellow (accelerating)
      hue = 120 - ((speedRatio - 1.2) / 0.3) * 60; // 120 to 60
    } else {
      // Yellow to red (high speed, low pressure)
      hue = 60 - ((speedRatio - 1.5) / 0.5) * 60; // 60 to 0
    }

    const saturation = 70 + pressure * 20; // Adjust saturation with pressure
    const lightness = 50;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  }
}

import { Point } from "../../types";

export interface FlowPoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
  pressure: number; // Cp
  speed: number;
}

export class CFDFlowSolver {
  static calculateVelocityField(
    geometry: Point[],
    freeStreamVelocity: number,
    angleOfAttack: number,
    gridResolution: number = 50
  ): FlowPoint[] {
    const flowField: FlowPoint[] = [];
    const alpha = (angleOfAttack * Math.PI) / 180;
    const circulation = 4 * Math.PI * freeStreamVelocity * Math.sin(alpha);

    // Grid bounds
    const minX = -0.7,
      maxX = 1.5;
    const minY = -0.8,
      maxY = 0.8;
    const stepX = (maxX - minX) / gridResolution;
    const stepY = (maxY - minY) / gridResolution;

    for (let i = 0; i <= gridResolution; i++) {
      for (let j = 0; j <= gridResolution; j++) {
        const x = minX + i * stepX;
        const y = minY + j * stepY;
        const vel = this.getPotentialVelocity(
          x,
          y,
          freeStreamVelocity,
          alpha,
          circulation
        );
        const pressure = 1 - Math.pow(vel.speed / freeStreamVelocity, 2);

        flowField.push({
          x,
          y,
          vx: vel.vx,
          vy: vel.vy,
          pressure,
          speed: vel.speed,
        });
      }
    }
    return flowField;
  }

  static generateStreamlines(
    flowField: FlowPoint[],
    freeStreamVelocity: number,
    angleOfAttack: number,
    geometry: Point[],
    numLines: number = 15
  ) {
    const streamlines = [];
    const spacing = 1.2 / (numLines + 1);

    for (let i = 1; i <= numLines; i++) {
      const startPoint: Point = { x: -0.6, y: -0.6 + i * spacing };
      streamlines.push(
        this.integrateStreamline(
          startPoint,
          flowField,
          freeStreamVelocity,
          angleOfAttack,
          geometry
        )
      );
    }
    return streamlines;
  }

  private static integrateStreamline(
    start: Point,
    flowField: FlowPoint[],
    vInf: number,
    aoa: number,
    geometry: Point[]
  ) {
    const points: Point[] = [start];
    const speeds: number[] = [];
    const pressures: number[] = [];
    let current = { ...start };
    const dt = 0.008;
    const alpha = (aoa * Math.PI) / 180;

    for (let step = 0; step < 450; step++) {
      // RK4 integration for continuous, smooth lines
      const k1 = this.interpolateVelocity(current, vInf, alpha);
      const k2 = this.interpolateVelocity(
        { x: current.x + 0.5 * dt * k1.vx, y: current.y + 0.5 * dt * k1.vy },
        vInf,
        alpha
      );
      const k3 = this.interpolateVelocity(
        { x: current.x + 0.5 * dt * k2.vx, y: current.y + 0.5 * dt * k2.vy },
        vInf,
        alpha
      );
      const k4 = this.interpolateVelocity(
        { x: current.x + dt * k3.vx, y: current.y + dt * k3.vy },
        vInf,
        alpha
      );

      current.x += (dt / 6) * (k1.vx + 2 * k2.vx + 2 * k3.vx + k4.vx);
      current.y += (dt / 6) * (k1.vy + 2 * k2.vy + 2 * k3.vy + k4.vy);

      points.push({ ...current });
      speeds.push(k1.speed);
      pressures.push(k1.pressure);

      if (this.isInsideGeometry(current.x, current.y, geometry)) break;
      if (current.x > 1.4 || current.x < -0.7 || Math.abs(current.y) > 0.75)
        break;
    }
    return { points, speeds, pressures };
  }

  static getFlowLineColor(pressure: number): string {
    // Technical CFD Scale: Blue (High Pressure) to Red (Low Pressure/Fast)
    const clampedCp = Math.max(-1.5, Math.min(1.0, pressure));
    const norm = (clampedCp + 1.5) / 2.5;
    return `hsl(${norm * 240}, 85%, 50%)`;
  }

  private static interpolateVelocity(p: Point, vInf: number, alpha: number) {
    const circulation = 4 * Math.PI * vInf * Math.sin(alpha);
    const vel = this.getPotentialVelocity(p.x, p.y, vInf, alpha, circulation);
    return { ...vel, pressure: 1 - Math.pow(vel.speed / vInf, 2) };
  }

  private static getPotentialVelocity(
    x: number,
    y: number,
    vInf: number,
    alpha: number,
    circulation: number
  ) {
    const r2 = x * x + y * y;
    const r = Math.sqrt(r2);
    const theta = Math.atan2(y, x);
    const R = 0.15;
    const vr = vInf * (1 - (R * R) / r2) * Math.cos(theta - alpha);
    const vt =
      -vInf * (1 + (R * R) / r2) * Math.sin(theta - alpha) -
      circulation / (2 * Math.PI * r);
    return {
      vx: vr * Math.cos(theta) - vt * Math.sin(theta),
      vy: vr * Math.sin(theta) + vt * Math.cos(theta),
      speed: Math.sqrt(vr * vr + vt * vt),
    };
  }

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
}

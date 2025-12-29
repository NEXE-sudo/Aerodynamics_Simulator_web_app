/**
 * Live particle system for flow visualization
 * 60 FPS target
 */

import { Point } from "../../types";

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  life: number;
  color: string;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 200;

  constructor(private geometry: Point[]) {}

  update(dt: number, velocity: number, alpha: number) {
    // Spawn new particles - rate proportional to velocity
    const spawnRate = Math.floor((velocity / 20) * 3); // More particles at higher velocities
    for (
      let i = 0;
      i < spawnRate && this.particles.length < this.maxParticles;
      i++
    ) {
      this.spawnParticle(velocity, alpha);
    }

    // Update existing particles
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;

      p.prevX = p.x;
      p.prevY = p.y;
      p.prevZ = p.z;

      const alphaRad = (alpha * Math.PI) / 180;

      const baseVx = (velocity / 20) * 0.02 * Math.cos(alphaRad);
      const baseVy = (velocity / 20) * 0.02 * Math.sin(alphaRad);

      const distToAirfoil = Math.min(
        ...this.geometry.map((gp) =>
          Math.sqrt((gp.x - p.x) * (gp.x - p.x) + (gp.y - p.y) * (gp.y - p.y))
        )
      );

      const accelerationFactor =
        distToAirfoil < 0.15 ? 1 + (0.15 - distToAirfoil) * 3 : 1;

      p.x += baseVx * accelerationFactor * dt * 30;
      p.y += (baseVy + (p.y > 0 ? -0.001 : 0.001)) * dt * 30;
      p.z += p.vz * dt * 30;

      p.vz += (Math.random() - 0.5) * 0.0005;
      p.vz = Math.max(-0.01, Math.min(0.01, p.vz));

      if (this.isInsideGeometry(p.x, p.y)) return false;

      return p.x < 2 && Math.abs(p.y) < 1 && Math.abs(p.z) < 1;
    });
  }

  private spawnParticle(velocity: number, alpha: number) {
    const alphaRad = (alpha * Math.PI) / 180;
    const spawnY = (Math.random() - 0.5) * 0.8;
    const spawnZ = (Math.random() - 0.5) * 0.5;

    const hue = 200 + (0.5 - Math.abs(spawnY)) * 60;

    const x = -0.5;
    const y = spawnY;
    const z = spawnZ;

    this.particles.push({
      x,
      y,
      z,
      vx: velocity * 0.01 * Math.cos(alphaRad),
      vy: velocity * 0.01 * Math.sin(alphaRad),
      vz: (Math.random() - 0.5) * velocity * 0.002,
      prevX: x,
      prevY: y,
      prevZ: z,
      life: 3 + Math.random(),
      color: `hsl(${hue}, 70%, 60%)`,
    });
  }

  private isInsideGeometry(x: number, y: number): boolean {
    // Simple point-in-polygon check
    let inside = false;
    for (
      let i = 0, j = this.geometry.length - 1;
      i < this.geometry.length;
      j = i++
    ) {
      const xi = this.geometry[i].x,
        yi = this.geometry[i].y;
      const xj = this.geometry[j].x,
        yj = this.geometry[j].y;

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }

  getParticles(): Particle[] {
    return this.particles;
  }
}

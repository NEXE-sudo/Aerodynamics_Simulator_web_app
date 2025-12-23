/**
 * Live particle system for flow visualization
 * 60 FPS target
 */

import { Point } from "../../types";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
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

      // Physics-based velocity field
      const alphaRad = (alpha * Math.PI) / 180;

      // Velocity components considering angle of attack
      const baseVx = (velocity / 20) * 0.02 * Math.cos(alphaRad);
      const baseVy = (velocity / 20) * 0.02 * Math.sin(alphaRad);

      // Add deflection based on distance to geometry
      const distToAirfoil = Math.min(
        ...this.geometry.map((gp) =>
          Math.sqrt((gp.x - p.x) * (gp.x - p.x) + (gp.y - p.y) * (gp.y - p.y))
        )
      );

      // Flow acceleration over airfoil (Bernoulli effect)
      const accelerationFactor =
        distToAirfoil < 0.15 ? 1 + (0.15 - distToAirfoil) * 3 : 1;

      p.x += baseVx * accelerationFactor * dt * 30;
      p.y += (baseVy + (p.y > 0 ? -0.001 : 0.001)) * dt * 30;

      // Check collision with geometry
      if (this.isInsideGeometry(p.x, p.y)) return false;

      return p.x < 2 && Math.abs(p.y) < 1; // Remove if off-screen
    });
  }

  private spawnParticle(velocity: number, alpha: number) {
    const alphaRad = (alpha * Math.PI) / 180;
    const spawnY = (Math.random() - 0.5) * 0.8;

    // Color based on height (simulating different flow speeds)
    const hue = 200 + (0.5 - Math.abs(spawnY)) * 60; // Top/bottom = blue, middle = cyan

    this.particles.push({
      x: -0.5,
      y: spawnY,
      vx: velocity * 0.01 * Math.cos(alphaRad),
      vy: velocity * 0.01 * Math.sin(alphaRad),
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

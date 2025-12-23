/**
 * Live particle system for flow visualization
 * 60 FPS target
 */

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
    // Spawn new particles
    if (this.particles.length < this.maxParticles) {
      this.spawnParticle(velocity, alpha);
    }

    // Update existing particles
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;

      // Simple velocity field
      const alphaRad = (alpha * Math.PI) / 180;
      p.x += p.vx * dt;
      p.y += p.vy * dt + Math.sin(alphaRad) * 0.01;

      // Check collision with geometry
      if (this.isInsideGeometry(p.x, p.y)) return false;

      return p.x < 2; // Remove if off-screen
    });
  }

  private spawnParticle(velocity: number, alpha: number) {
    const alphaRad = (alpha * Math.PI) / 180;
    this.particles.push({
      x: -0.5,
      y: (Math.random() - 0.5) * 0.8,
      vx: velocity * 0.01 * Math.cos(alphaRad),
      vy: velocity * 0.01 * Math.sin(alphaRad),
      life: 3,
      color: `hsl(${200 + Math.random() * 60}, 70%, 50%)`,
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

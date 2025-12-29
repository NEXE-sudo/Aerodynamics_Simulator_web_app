/**
 * FlowSimulation.ts
 * =================
 * Manages particle lifecycle, collision detection, and time-stepping.
 *
 * Key features:
 * - Grid-based particle seeding (no random bursts)
 * - Hardened time-stepping (stable under tab switching)
 * - Swept collision detection (minimal tunneling)
 * - Extended particle lifespans (smooth wake visualization)
 */

import { SpatialHash } from "./SpatialHash";
import { VelocityField } from "./VelocityField";

interface Particle {
  position: [number, number, number];
  velocity: [number, number, number];
  age: number;
  active: boolean;
}

interface CollisionObject {
  center: [number, number, number];
  radius: number;
  normal: [number, number, number];
}

export class FlowSimulation {
  particles: Particle[] = [];
  private spatialHash: SpatialHash;
  private velocityField: VelocityField;
  private bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  private dt = 1 / 60; // Fixed timestep
  private accumulator = 0;
  private collisionObjects: CollisionObject[] = [];

  constructor(
    geometry: Array<{ x: number; y: number }>,
    particleCount: number,
    flowVelocity: number,
    angleOfAttack: number
  ) {
    this.bounds = this.computeFlowBounds(geometry);
    this.spatialHash = new SpatialHash(0.15);
    this.velocityField = new VelocityField(flowVelocity, angleOfAttack);

    this.buildCollisionObjects(geometry);
    this.initializeParticles(particleCount);
  }

  private computeFlowBounds(geometry: Array<{ x: number; y: number }>): {
    min: [number, number, number];
    max: [number, number, number];
  } {
    let minX = Infinity,
      maxX = -Infinity;
    let minY = Infinity,
      maxY = -Infinity;

    geometry.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });

    return {
      min: [minX - 2, minY - 1.5, -0.8],
      max: [maxX + 8, maxY + 1.5, 0.8], // Extended outlet for wake visualization
    };
  }

  /**
   * Build dense collision mesh from airfoil geometry
   * - Multiple Z-layers for 3D coverage
   * - Edge interpolation to prevent tunneling
   */
  private buildCollisionObjects(
    geometry: Array<{ x: number; y: number }>
  ): void {
    for (let i = 0; i < geometry.length; i++) {
      const p = geometry[i];
      const next = geometry[(i + 1) % geometry.length];

      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;

        // Dense Z-axis coverage (11 layers)
        for (let z = -0.5; z <= 0.5; z += 0.1) {
          this.collisionObjects.push({
            center: [p.x, p.y, z],
            radius: 0.05,
            normal: [nx, ny, 0],
          });
        }

        // Interpolate along edges for continuous coverage
        const segments = Math.ceil(len / 0.05);
        for (let s = 1; s < segments; s++) {
          const t = s / segments;
          const interpX = p.x + dx * t;
          const interpY = p.y + dy * t;

          for (let z = -0.5; z <= 0.5; z += 0.1) {
            this.collisionObjects.push({
              center: [interpX, interpY, z],
              radius: 0.05,
              normal: [nx, ny, 0],
            });
          }
        }
      }
    }
  }

  /**
   * Grid-based particle initialization
   * - Even spatial distribution at inlet
   * - Staggered ages prevent synchronized resets
   */
  private initializeParticles(count: number): void {
    const { min, max } = this.bounds;
    const height = max[1] - min[1];
    const depth = max[2] - min[2];

    const rows = Math.ceil(Math.sqrt(count));
    const cols = Math.ceil(count / rows);

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;

      const particle: Particle = {
        position: [
          min[0] + 0.3,
          min[1] + (row / rows) * height,
          min[2] + (col / cols) * depth,
        ],
        velocity: [0, 0, 0],
        age: (i / count) * 10.0, // Stagger ages evenly
        active: true,
      };

      this.particles.push(particle);
    }
  }

  /**
   * Create new particle at inlet (for respawning)
   */
  private createParticle(): Particle {
    const { min, max } = this.bounds;
    const height = max[1] - min[1];
    const depth = max[2] - min[2];

    return {
      position: [
        min[0] + 0.3,
        min[1] + Math.random() * height,
        min[2] + Math.random() * depth,
      ],
      velocity: [0, 0, 0],
      age: 0,
      active: true,
    };
  }

  /**
   * HARDENED TIME-STEPPING
   * - Clamps excessive deltas (tab switching)
   * - Limits simulation steps per frame (prevents spiral of death)
   * - Discards excess time debt if overwhelmed
   */
  update(deltaTime: number): void {
    const safeDelta = Math.min(deltaTime, 0.1); // Max 100ms step
    this.accumulator += safeDelta;

    const MAX_STEPS = 5;
    let steps = 0;

    while (this.accumulator >= this.dt && steps < MAX_STEPS) {
      this.step();
      this.accumulator -= this.dt;
      steps++;
    }

    // Discard excess time if we hit the limit
    if (steps >= MAX_STEPS) {
      this.accumulator = 0;
    }
  }

  /**
   * Single simulation step
   * - Sample velocity field
   * - Detect collisions with swept sphere test
   * - Update particle positions and velocities
   * - Respawn particles that exit bounds or age out
   */
  private step(): void {
    this.spatialHash.clear();
    this.collisionObjects.forEach((obj) => this.spatialHash.insert(obj));

    for (const particle of this.particles) {
      if (!particle.active) continue;

      const fieldVel = this.velocityField.sample(particle.position);
      const startPos: [number, number, number] = [...particle.position];
      const nextPos: [number, number, number] = [
        particle.position[0] + fieldVel[0] * this.dt,
        particle.position[1] + fieldVel[1] * this.dt,
        particle.position[2] + fieldVel[2] * this.dt,
      ];

      const collision = this.checkSweptCollision(startPos, nextPos, 0.04);

      if (collision) {
        const n = collision.normal;
        const V = fieldVel;

        // MATH FIX: Replace reflection with Tangent Projection
        // V_tangent = V - (V · n) * n
        const vDotN = V[0] * n[0] + V[1] * n[1] + V[2] * n[2];

        particle.velocity = [
          V[0] - vDotN * n[0],
          V[1] - vDotN * n[1],
          V[2] - vDotN * n[2],
        ];

        // STABILIZATION: Remove penetration + small offset along normal
        particle.position = [
          collision.impactPoint[0] + n[0] * 0.02,
          collision.impactPoint[1] + n[1] * 0.02,
          collision.impactPoint[2] + n[2] * 0.02,
        ];
      } else {
        particle.velocity = fieldVel;
        particle.position = nextPos;
      }

      particle.age += this.dt;

      const { min, max } = this.bounds;
      const outOfBounds =
        particle.position[0] < min[0] ||
        particle.position[0] > max[0] ||
        particle.position[1] < min[1] ||
        particle.position[1] > max[1] ||
        particle.position[2] < min[2] ||
        particle.position[2] > max[2];

      // Extended lifespan (12 seconds)
      if (outOfBounds || particle.age > 12.0) {
        Object.assign(particle, this.createParticle());
      }
    }
  }

  /**
   * Swept sphere collision detection
   * - Samples along path to prevent tunneling
   * - Returns collision point and normal if hit detected
   */
  private checkSweptCollision(
    start: [number, number, number],
    end: [number, number, number],
    radius: number
  ): {
    normal: [number, number, number];
    impactPoint: [number, number, number];
  } | null {
    const samples = 5;
    for (let i = 0; i < samples; i++) {
      const t = i / (samples - 1);
      const testPos: [number, number, number] = [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t,
      ];

      const collision = this.spatialHash.querySphere(testPos, radius);
      if (collision) {
        return {
          normal: collision.normal,
          impactPoint: testPos,
        };
      }
    }
    return null;
  }

  /**
   * Get particle positions for rendering
   */
  getPositions(): Float32Array {
    const arr = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }

  /**
   * Get particle velocities for rendering (NEW - for coloring)
   */
  getVelocities(): Float32Array {
    const arr = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      arr[i * 3] = p.velocity[0];
      arr[i * 3 + 1] = p.velocity[1];
      arr[i * 3 + 2] = p.velocity[2];
    });
    return arr;
  }
}

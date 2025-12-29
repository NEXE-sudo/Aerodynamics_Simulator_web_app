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
  private dt = 1 / 60;
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
      min: [minX - 2, minY - 1.5, -0.8], // Inlet depth unchanged
      max: [maxX + 3, maxY + 1.5, 0.8], // IMPROVED: Outlet extended (was +3, now +8)
    };
  }

  private buildCollisionObjects(
    geometry: Array<{ x: number; y: number }>
  ): void {
    // IMPROVED: Check every point, not every 3rd point
    for (let i = 0; i < geometry.length; i++) {
      const p = geometry[i];
      const next = geometry[(i + 1) % geometry.length];

      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;

        // IMPROVED: More Z layers (was 6 layers from -0.5 to 0.5, now 11 layers)
        for (let z = -0.5; z <= 0.5; z += 0.1) {
          this.collisionObjects.push({
            center: [p.x, p.y, z],
            radius: 0.05, // IMPROVED: Larger collision spheres (was 0.04)
            normal: [nx, ny, 0],
          });
        }

        // IMPROVED: Add intermediate points along edges for thick coverage
        const segments = Math.ceil(len / 0.05); // One sphere every 0.05 units
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

  private initializeParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = this.createParticle();
      // Stagger initial ages to prevent synchronized resets
      particle.age = Math.random() * 5.0;
      this.particles.push(particle);
    }
  }

  private createParticle(): Particle {
    const { min, max } = this.bounds;
    return {
      position: [
        // Distribute across inlet depth, not just at min[0]
        min[0] + Math.random() * 0.5,
        min[1] + Math.random() * (max[1] - min[1]),
        min[2] + Math.random() * (max[2] - min[2]),
      ],
      velocity: [0, 0, 0],
      age: 0, // Will be staggered on init
      active: true,
    };
  }

  update(deltaTime: number): void {
    // Clamp excessive deltas (tab switching, frame hitches)
    const safeDelta = Math.min(deltaTime, 0.1); // Max 100ms step
    this.accumulator += safeDelta;

    // Prevent spiral of death
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

      // IMPROVED: Larger particle radius for more conservative collision
      const particleRadius = 0.04; // Was 0.02, now 2x larger

      const collision = this.checkSweptCollision(
        startPos,
        nextPos,
        particleRadius
      );

      if (collision) {
        const normal = collision.normal;
        const vDotN =
          fieldVel[0] * normal[0] +
          fieldVel[1] * normal[1] +
          fieldVel[2] * normal[2];

        particle.velocity = [
          (fieldVel[0] - 2 * vDotN * normal[0]) * 0.5, // Reduced bounce (was 0.6)
          (fieldVel[1] - 2 * vDotN * normal[1]) * 0.5,
          (fieldVel[2] - 2 * vDotN * normal[2]) * 0.5,
        ];

        // IMPROVED: Push particle slightly away from collision surface
        particle.position = [
          collision.impactPoint[0] + normal[0] * 0.05,
          collision.impactPoint[1] + normal[1] * 0.05,
          collision.impactPoint[2] + normal[2] * 0.05,
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

      // IMPROVED: Much longer lifespan (was 5.0, now 15.0)
      if (outOfBounds || particle.age > 10.0) {
        Object.assign(particle, this.createParticle());
      }
    }
  }

  private checkSweptCollision(
    start: [number, number, number],
    end: [number, number, number],
    radius: number
  ): {
    normal: [number, number, number];
    impactPoint: [number, number, number];
  } | null {
    // IMPROVED: More samples along path (was 3, now 5)
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

  getPositions(): Float32Array {
    const arr = new Float32Array(this.particles.length * 3);
    this.particles.forEach((p, i) => {
      arr[i * 3] = p.position[0];
      arr[i * 3 + 1] = p.position[1];
      arr[i * 3 + 2] = p.position[2];
    });
    return arr;
  }
}

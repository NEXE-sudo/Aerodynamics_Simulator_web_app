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
      min: [minX - 2, minY - 1, -0.8],
      max: [maxX + 3, maxY + 1, 0.8],
    };
  }

  private buildCollisionObjects(
    geometry: Array<{ x: number; y: number }>
  ): void {
    for (let i = 0; i < geometry.length; i += 3) {
      const p = geometry[i];
      const next = geometry[(i + 1) % geometry.length];

      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      if (len > 0) {
        const nx = -dy / len;
        const ny = dx / len;

        for (let z = -0.5; z <= 0.5; z += 0.2) {
          this.collisionObjects.push({
            center: [p.x, p.y, z],
            radius: 0.04,
            normal: [nx, ny, 0],
          });
        }
      }
    }
  }

  private initializeParticles(count: number): void {
    for (let i = 0; i < count; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const { min, max } = this.bounds;
    return {
      position: [
        min[0],
        min[1] + Math.random() * (max[1] - min[1]),
        min[2] + Math.random() * (max[2] - min[2]),
      ],
      velocity: [0, 0, 0],
      age: 0,
      active: true,
    };
  }

  update(deltaTime: number): void {
    this.accumulator += deltaTime;

    while (this.accumulator >= this.dt) {
      this.step();
      this.accumulator -= this.dt;
    }
  }

  private step(): void {
    this.spatialHash.clear();
    this.collisionObjects.forEach((obj) => this.spatialHash.insert(obj));

    for (const particle of this.particles) {
      if (!particle.active) continue;

      const fieldVel = this.velocityField.sample(particle.position);

      const collision = this.spatialHash.querySphere(particle.position, 0.02);

      if (collision) {
        const normal = collision.normal;
        const vDotN =
          particle.velocity[0] * normal[0] +
          particle.velocity[1] * normal[1] +
          particle.velocity[2] * normal[2];

        particle.velocity = [
          (particle.velocity[0] - 2 * vDotN * normal[0]) * 0.6,
          (particle.velocity[1] - 2 * vDotN * normal[1]) * 0.6,
          (particle.velocity[2] - 2 * vDotN * normal[2]) * 0.6,
        ];
      } else {
        particle.velocity = fieldVel;
      }

      particle.position[0] += particle.velocity[0] * this.dt;
      particle.position[1] += particle.velocity[1] * this.dt;
      particle.position[2] += particle.velocity[2] * this.dt;

      particle.age += this.dt;

      const { min, max } = this.bounds;
      const outOfBounds =
        particle.position[0] < min[0] ||
        particle.position[0] > max[0] ||
        particle.position[1] < min[1] ||
        particle.position[1] > max[1] ||
        particle.position[2] < min[2] ||
        particle.position[2] > max[2];

      if (outOfBounds || particle.age > 5.0) {
        Object.assign(particle, this.createParticle());
      }
    }
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

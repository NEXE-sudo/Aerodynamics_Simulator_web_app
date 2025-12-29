import * as THREE from "three";
import { VelocityField } from "./VelocityField";

export class StreamlineGenerator {
  private velocityField: VelocityField;

  constructor(velocity: number, angleOfAttack: number) {
    this.velocityField = new VelocityField(velocity, angleOfAttack);
  }

  generateStreamlines(count: number): THREE.Vector3[][] {
    const lines: THREE.Vector3[][] = [];

    for (let i = 0; i < count; i++) {
      const y = -1.5 + (i / (count - 1)) * 3.0;
      const z = -0.6 + (i % 5) * 0.3;

      const line: THREE.Vector3[] = [];
      let pos: [number, number, number] = [-2, y, z];

      for (let step = 0; step < 150; step++) {
        line.push(new THREE.Vector3(pos[0], pos[1], pos[2]));

        const vel = this.velocityField.sample(pos);
        pos = [
          pos[0] + vel[0] * 0.05,
          pos[1] + vel[1] * 0.05,
          pos[2] + vel[2] * 0.05,
        ];

        if (pos[0] > 3) break;
      }

      lines.push(line);
    }

    return lines;
  }
}

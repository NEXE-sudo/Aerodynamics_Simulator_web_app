export class VelocityField {
  private baseVelocity: [number, number, number];

  constructor(velocity: number, angleOfAttack: number) {
    const angleRad = (angleOfAttack * Math.PI) / 180;
    const speed = velocity * 0.02;

    this.baseVelocity = [
      speed * Math.cos(angleRad),
      speed * Math.sin(angleRad),
      0,
    ];
  }

  sample(position: [number, number, number]): [number, number, number] {
    let vx = this.baseVelocity[0];
    let vy = this.baseVelocity[1];
    let vz = this.baseVelocity[2];

    // Add 3D turbulence
    const scale = 0.5;
    const strength = 0.003;

    const fx = Math.sin(position[0] * scale + position[1] * 0.3) * strength;
    const fy = Math.cos(position[1] * scale + position[2] * 0.3) * strength;
    const fz = Math.sin(position[2] * scale + position[0] * 0.3) * strength;

    return [vx + fx, vy + fy, vz + fz];
  }
}

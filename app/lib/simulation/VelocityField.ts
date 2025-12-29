export class VelocityField {
  private baseVelocity: [number, number, number];
  private angleRad: number;

  constructor(velocity: number, angleOfAttack: number) {
    this.angleRad = (angleOfAttack * Math.PI) / 180;
    const speed = velocity * 0.02;

    // Flow arrives at angle, not just horizontally
    this.baseVelocity = [
      speed * Math.cos(this.angleRad),
      speed * Math.sin(this.angleRad),
      0,
    ];
  }

  sample(position: [number, number, number]): [number, number, number] {
    let vx = this.baseVelocity[0];
    let vy = this.baseVelocity[1];
    let vz = this.baseVelocity[2];

    // Add vorticity near airfoil (angle-dependent)
    const distFromOrigin = Math.sqrt(position[0] ** 2 + position[1] ** 2);

    if (distFromOrigin < 1.5) {
      // Circulation strength scales with angle
      const circulation = Math.sin(this.angleRad) * 0.01;

      vx += -position[1] * circulation;
      vy += position[0] * circulation;
    }

    // 3D turbulence (unchanged)
    const scale = 0.5;
    const strength = 0.003;
    const fx = Math.sin(position[0] * scale + position[1] * 0.3) * strength;
    const fy = Math.cos(position[1] * scale + position[2] * 0.3) * strength;
    const fz = Math.sin(position[2] * scale + position[0] * 0.3) * strength;

    return [vx + fx, vy + fy, vz + fz];
  }
}

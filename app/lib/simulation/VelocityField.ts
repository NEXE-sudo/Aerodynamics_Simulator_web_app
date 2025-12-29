/**
 * VelocityField.ts
 * ================
 * Single source of truth for flow velocity at any point in space.
 *
 * - Implements angle-of-attack influence on flow direction
 * - Provides circulation (vorticity) near airfoil
 * - Adds 3D turbulence for visual realism
 *
 * All particle motion, coloring, and collision response use this field.
 */

export class VelocityField {
  private baseVelocity: [number, number, number];
  private angleRad: number;
  private circulationStrength: number;

  constructor(velocity: number, angleOfAttack: number) {
    this.angleRad = (angleOfAttack * Math.PI) / 180;
    const speed = velocity * 0.02;

    // Flow arrives at angle (creates effective AoA)
    this.baseVelocity = [
      speed * Math.cos(this.angleRad),
      speed * Math.sin(this.angleRad),
      0,
    ];

    // Circulation strength scales with AoA (simplified lift generation)
    // Higher AoA → stronger circulation → more flow deflection
    this.circulationStrength = Math.sin(this.angleRad) * 0.08;
  }

  /**
   * Sample velocity at any point in space
   * Returns [vx, vy, vz] velocity vector
   */
  sample(position: [number, number, number]): [number, number, number] {
    let vx = this.baseVelocity[0];
    let vy = this.baseVelocity[1];
    let vz = this.baseVelocity[2];

    // Circulation near airfoil (angle-dependent)
    const distFromOrigin = Math.sqrt(position[0] ** 2 + position[1] ** 2);

    if (distFromOrigin < 2.0 && distFromOrigin > 0.05) {
      // Circulation falls off with distance (exponential decay)
      const falloff = Math.exp(-distFromOrigin * 0.7);
      const circ = this.circulationStrength * falloff;

      // Rotational velocity field (perpendicular to radius)
      vx += -position[1] * circ;
      vy += position[0] * circ;
    }
    return [vx, vy, vz];
  }
}

/**
 * Aerodynamic Coefficient Calculations
 * Based on thin airfoil theory and empirical corrections
 */

export interface AirfoilGeometry {
  thickness: number; // Thickness ratio (0-1)
  camber: number; // Camber ratio (0-1)
  angleOfAttack: number; // Degrees
}

export interface Coefficients {
  cl: number; // Lift coefficient
  cd: number; // Drag coefficient
  cm?: number; // Moment coefficient (optional)
}

export class CoefficientCalculator {
  /**
   * Calculate lift coefficient using thin airfoil theory
   * cl = cl_α * α + cl_0
   */
  static calculateLift(geometry: AirfoilGeometry, reynolds: number): number {
    const alphaRad = (geometry.angleOfAttack * Math.PI) / 180;

    // Theoretical lift slope (2π for thin airfoil)
    const liftSlope = 2 * Math.PI;

    // Zero-lift contribution from camber
    const camberLift = geometry.camber * Math.PI;

    // Thickness correction (thicker airfoils have reduced lift slope)
    const thicknessCorrection = 1 - 0.3 * geometry.thickness;

    // Reynolds number correction (viscous effects)
    const reynoldsCorrection = Math.min(1, Math.log10(reynolds) / 6);

    // Stall approximation
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    let stallFactor = 1;

    if (Math.abs(geometry.angleOfAttack) > stallAngle) {
      // Cosine decay after stall
      const excessAngle = Math.abs(geometry.angleOfAttack) - stallAngle;
      stallFactor = Math.cos((excessAngle * Math.PI) / 180) * 0.5;
    }

    const cl =
      (liftSlope * alphaRad + camberLift) *
      thicknessCorrection *
      reynoldsCorrection *
      stallFactor;

    return cl;
  }

  /**
   * Calculate drag coefficient using empirical models
   * cd = cd_0 + cd_i + cd_p + cd_f
   */
  static calculateDrag(
    geometry: AirfoilGeometry,
    cl: number,
    reynolds: number
  ): number {
    // Profile drag at zero lift (increases with thickness)
    const cd0 = 0.006 + geometry.thickness * 0.02;

    // Induced drag (lift-dependent)
    // Assumes finite wing with aspect ratio AR = 6, Oswald efficiency e = 0.85
    const aspectRatio = 6;
    const oswaldEfficiency = 0.85;
    const cdi = (cl * cl) / (Math.PI * aspectRatio * oswaldEfficiency);

    // Pressure drag (form drag at angle)
    const alphaRad = Math.abs((geometry.angleOfAttack * Math.PI) / 180);
    const cdp = Math.sin(alphaRad) * Math.sin(alphaRad) * 0.1;

    // Skin friction drag
    const cf = 0.074 / Math.pow(reynolds, 0.2);

    // Post-stall drag increase
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    let stallDragMultiplier = 1;

    if (Math.abs(geometry.angleOfAttack) > stallAngle) {
      const excessAngle = Math.abs(geometry.angleOfAttack) - stallAngle;
      stallDragMultiplier = 1 + (excessAngle / stallAngle) * 0.5;
    }

    const cd = (cd0 + cdi + cdp + cf) * stallDragMultiplier;

    return cd;
  }

  /**
   * Calculate both lift and drag coefficients
   */
  static calculate(geometry: AirfoilGeometry, reynolds: number): Coefficients {
    const cl = this.calculateLift(geometry, reynolds);
    const cd = this.calculateDrag(geometry, cl, reynolds);

    return { cl, cd };
  }

  /**
   * Estimate stall angle based on thickness
   * Thicker airfoils stall at lower angles
   */
  private static estimateStallAngle(thickness: number): number {
    // Empirical correlation: thin airfoils stall ~16°, thick airfoils ~12°
    return 15 - thickness * 10;
  }

  /**
   * Calculate lift-to-drag ratio (aerodynamic efficiency)
   */
  static calculateEfficiency(cl: number, cd: number): number {
    return cl / Math.max(cd, 0.001); // Avoid division by zero
  }

  /**
   * Estimate moment coefficient (about quarter-chord)
   * Simplified model for educational purposes
   */
  static calculateMoment(geometry: AirfoilGeometry, cl: number): number {
    // Moment coefficient depends primarily on camber
    // Symmetric airfoils have cm ≈ 0 at quarter-chord
    const cmCamber = -geometry.camber * 0.1;

    // Additional contribution from lift
    const cmLift = -cl * 0.05;

    return cmCamber + cmLift;
  }

  /**
   * Get uncertainty factor based on flow regime
   */
  static getUncertaintyFactor(confidence: "high" | "medium" | "low"): number {
    const factors = {
      high: 0.1, // ±10%
      medium: 0.25, // ±25%
      low: 0.4, // ±40%
    };
    return factors[confidence];
  }
}

/**
 * Pure Analytical Physics Engine
 * ================================
 * Uses: Thin airfoil theory, empirical drag models, Reynolds scaling
 * Does NOT model: Stall details, separation, turbulence, surface pressure accuracy
 * Purpose: Educational visualization and conceptual design exploration
 *
 * NO React dependencies - can be called from Rust via Tauri commands later
 */

export interface FlowConditions {
  velocity: number; // m/s
  density: number; // kg/m³
  viscosity?: number; // Pa·s (default: 1.81e-5 for air at 15°C)
}

export interface GeometryParams {
  chord: number; // m
  thickness: number; // ratio (e.g., 0.12 = 12%)
  camber: number; // ratio (e.g., 0.02 = 2%)
  angleOfAttack: number; // degrees
}

export interface AeroCoefficients {
  cl: number; // Lift coefficient
  cd: number; // Drag coefficient
  cm: number; // Moment coefficient (future)
}

export interface AeroForces {
  lift: number; // N
  drag: number; // N
  efficiency: number; // L/D ratio
}

/**
 * Core analytical physics calculations
 */
export class AnalyticalPhysics {
  /**
   * Calculate Reynolds number
   * Re = ρVL/μ
   */
  static reynolds(flow: FlowConditions, chord: number): number {
    const mu = flow.viscosity ?? 1.81e-5;
    return (flow.density * flow.velocity * chord) / mu;
  }

  /**
   * Classify flow regime based on Reynolds number
   */
  static classifyFlow(Re: number): {
    type: string;
    confidence: "high" | "medium" | "low";
  } {
    if (Re < 5e4) {
      return { type: "very-low-Re", confidence: "low" };
    } else if (Re < 5e5) {
      return { type: "laminar", confidence: "high" };
    } else if (Re < 1e6) {
      return { type: "transitional", confidence: "medium" };
    } else if (Re < 3e6) {
      return { type: "turbulent", confidence: "medium" };
    } else {
      return { type: "high-Re-turbulent", confidence: "low" };
    }
  }

  /**
   * Thin airfoil theory - Lift coefficient
   * Valid for: small angles, attached flow, thin airfoils
   *
   * cl = cl_α * α + cl_0
   * where:
   *   cl_α ≈ 2π (theoretical lift slope)
   *   cl_0 = camber contribution
   */
  static thinAirfoilLift(geometry: GeometryParams, Re: number): number {
    const alphaRad = (geometry.angleOfAttack * Math.PI) / 180;

    // Camber contribution (zero-lift angle shift)
    const cl0 = 2 * Math.PI * geometry.camber;

    // Lift slope (theoretical)
    const clAlpha = 2 * Math.PI;

    // Reynolds correction (viscous effects reduce lift at low Re)
    const reCorrection = Math.min(1, Math.log10(Re) / 6);

    // Thickness correction (thick airfoils reduce lift slope slightly)
    const thicknessCorrection = 1 - 0.25 * geometry.thickness;

    // Base lift coefficient
    let cl = (cl0 + clAlpha * alphaRad) * reCorrection * thicknessCorrection;

    // Stall approximation (cosine decay after critical angle)
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    if (Math.abs(geometry.angleOfAttack) > stallAngle) {
      const stallFactor = Math.cos(
        ((Math.abs(geometry.angleOfAttack) - stallAngle) * Math.PI) /
          (90 - stallAngle)
      );
      cl *= Math.max(0.3, stallFactor);
    }

    return cl;
  }

  /**
   * Estimate stall angle based on thickness
   * Thicker airfoils stall earlier
   */
  private static estimateStallAngle(thickness: number): number {
    return 16 - thickness * 20; // Rough empirical correlation
  }

  /**
   * Empirical drag model
   * cd = cd_0 + cd_i + cd_p + cd_f
   *
   * cd_0 = profile drag (pressure + friction at zero lift)
   * cd_i = induced drag (lift-dependent)
   * cd_p = pressure drag (angle-dependent)
   * cd_f = skin friction
   */
  static empiricalDrag(
    geometry: GeometryParams,
    cl: number,
    Re: number
  ): number {
    // Profile drag (minimum drag at zero lift)
    // Increases with thickness
    const cd0 = 0.006 + geometry.thickness * 0.018;

    // Induced drag (from finite wing effects)
    // Assumes aspect ratio AR = 6, Oswald efficiency e = 0.85
    const AR = 6;
    const e = 0.85;
    const cdi = (cl * cl) / (Math.PI * AR * e);

    // Pressure drag (form drag at angle)
    const alphaRad = Math.abs((geometry.angleOfAttack * Math.PI) / 180);
    const cdp = Math.sin(alphaRad) * Math.sin(alphaRad) * 0.12;

    // Skin friction (turbulent flat plate approximation)
    const cf = 0.074 / Math.pow(Re, 0.2);

    // Post-stall drag increase
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    let stallDragFactor = 1;
    if (Math.abs(geometry.angleOfAttack) > stallAngle) {
      stallDragFactor =
        1 + (0.5 * Math.abs(geometry.angleOfAttack - stallAngle)) / stallAngle;
    }

    return (cd0 + cdi + cdp + cf) * stallDragFactor;
  }

  /**
   * Calculate aerodynamic coefficients
   */
  static calculateCoefficients(
    geometry: GeometryParams,
    flow: FlowConditions
  ): AeroCoefficients {
    const Re = this.reynolds(flow, geometry.chord);
    const cl = this.thinAirfoilLift(geometry, Re);
    const cd = this.empiricalDrag(geometry, cl, Re);

    return {
      cl,
      cd,
      cm: 0, // Moment coefficient not implemented yet
    };
  }

  /**
   * Calculate aerodynamic forces
   */
  static calculateForces(
    coefficients: AeroCoefficients,
    flow: FlowConditions,
    area: number
  ): AeroForces {
    // Dynamic pressure: q = 0.5 * ρ * V²
    const q = 0.5 * flow.density * flow.velocity * flow.velocity;

    // Forces: F = q * S * C
    const lift = q * area * coefficients.cl;
    const drag = q * area * coefficients.cd;

    // Efficiency (L/D ratio)
    const efficiency = coefficients.cl / Math.max(coefficients.cd, 0.001);

    return { lift, drag, efficiency };
  }

  /**
   * Assess stall risk
   */
  static stallRisk(geometry: GeometryParams): "none" | "warning" | "critical" {
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    const absAngle = Math.abs(geometry.angleOfAttack);

    if (absAngle < stallAngle * 0.7) {
      return "none";
    } else if (absAngle < stallAngle) {
      return "warning";
    } else {
      return "critical";
    }
  }

  /**
   * Generate uncertainty bounds based on flow regime confidence
   */
  static uncertaintyBounds(
    value: number,
    confidence: "high" | "medium" | "low"
  ): { min: number; max: number; nominal: number } {
    const uncertaintyFactors = {
      high: 0.1, // ±10%
      medium: 0.25, // ±25%
      low: 0.4, // ±40%
    };

    const factor = uncertaintyFactors[confidence];

    return {
      min: value * (1 - factor),
      max: value * (1 + factor),
      nominal: value,
    };
  }
}

/**
 * Reynolds Number Calculations and Flow Classification
 */

export interface FlowProperties {
  density: number; // kg/m³
  velocity: number; // m/s
  characteristicLength: number; // m (chord length)
  viscosity?: number; // Pa·s (default: air at 15°C)
}

export interface FlowClassification {
  reynolds: number;
  regime:
    | "laminar"
    | "transitional"
    | "turbulent"
    | "separation-likely"
    | "very-low-Re"
    | "high-Re-turbulent";
  confidence: "high" | "medium" | "low";
  description: string;
}

export class ReynoldsCalculator {
  // Dynamic viscosity of air at 15°C (Pa·s)
  private static readonly AIR_VISCOSITY_DEFAULT = 1.81e-5;

  /**
   * Calculate Reynolds number
   * Re = (ρ * V * L) / μ
   */
  static calculate(props: FlowProperties): number {
    const mu = props.viscosity ?? this.AIR_VISCOSITY_DEFAULT;
    return (props.density * props.velocity * props.characteristicLength) / mu;
  }

  /**
   * Classify flow regime based on Reynolds number
   */
  static classify(reynolds: number): FlowClassification {
    if (reynolds < 5e4) {
      return {
        reynolds,
        regime: "very-low-Re",
        confidence: "low",
        description:
          "Very low Reynolds - viscous effects dominate, high uncertainty",
      };
    } else if (reynolds < 5e5) {
      return {
        reynolds,
        regime: "laminar",
        confidence: "high",
        description: "Laminar boundary layer - smooth, predictable flow",
      };
    } else if (reynolds < 1e6) {
      return {
        reynolds,
        regime: "transitional",
        confidence: "medium",
        description: "Transitional regime - flow becoming turbulent",
      };
    } else if (reynolds < 3e6) {
      return {
        reynolds,
        regime: "turbulent",
        confidence: "medium",
        description: "Fully turbulent boundary layer",
      };
    } else {
      return {
        reynolds,
        regime: "high-Re-turbulent",
        confidence: "low",
        description:
          "High Reynolds turbulent - complex flow, increased uncertainty",
      };
    }
  }

  /**
   * Get Reynolds correction factor for lift calculations
   * Accounts for viscous effects at different Re
   */
  static getLiftCorrection(reynolds: number): number {
    // Based on empirical data - lift decreases at low Re
    return Math.min(1, Math.log10(reynolds) / 6);
  }

  /**
   * Get skin friction coefficient for flat plate
   * Uses turbulent or laminar correlation based on Re
   */
  static getSkinFrictionCoefficient(reynolds: number): number {
    if (reynolds < 5e5) {
      // Laminar: Cf = 1.328 / sqrt(Re)
      return 1.328 / Math.sqrt(reynolds);
    } else {
      // Turbulent: Cf = 0.074 / Re^0.2
      return 0.074 / Math.pow(reynolds, 0.2);
    }
  }
}

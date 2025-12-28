/**
 * Unified Reduced-Order Aerodynamics Physics Engine
 * ===================================================
 *
 * Core Philosophy:
 * - Fast, real-time computation suitable for browser
 * - Honest about uncertainty and limitations
 * - Trend-accurate, not falsely precise
 * - Educational and explainable
 *
 * Physical Basis:
 * - Potential flow + boundary layer corrections
 * - Thin airfoil theory for lift
 * - Empirical drag models
 * - Reynolds-dependent regime classification
 *
 * What this DOES:
 * ✓ Predict trends in lift/drag with parameter changes
 * ✓ Estimate flow regimes and confidence
 * ✓ Support fast design iteration
 * ✓ Generate educational explanations
 *
 * What this DOES NOT do:
 * ✗ Solve Navier-Stokes equations
 * ✗ Accurately predict separation details
 * ✗ Model complex 3D effects
 * ✗ Replace wind tunnel or CFD validation
 */

import { ReynoldsCalculator, FlowClassification } from "./reynolds";
import {
  CoefficientCalculator,
  AirfoilGeometry,
  Coefficients,
} from "./coefficients";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FlowConditions {
  velocity: number; // m/s
  density: number; // kg/m³ (default: 1.225 for sea level)
  viscosity?: number; // Pa·s (default: 1.81e-5 for air at 15°C)
}

export interface GeometryDefinition {
  type: "symmetric" | "cambered" | "flat-plate";
  chord: number; // m (reference length)
  thickness: number; // ratio (0-1)
  camber: number; // ratio (0-1)
  angleOfAttack: number; // degrees
  area: number; // m² (reference area, for 3D wing)
}

export interface UncertaintyBounds {
  min: number;
  nominal: number;
  max: number;
  confidence: "high" | "medium" | "low";
}

export interface FlowState {
  reynolds: number;
  regime: FlowClassification;
  dynamicPressure: number; // Pa
  separation: "attached" | "marginal" | "separated" | "stalled";
  separationConfidence: number; // 0-1
  confidence: "high" | "medium" | "low";
}

export interface AerodynamicResults {
  flowState: FlowState;

  dynamicPressure: number;

  reynolds: number;
  confidence: "high" | "medium" | "low";
  regime: { type: string };

  liftVector: { x: number; y: number; z: number };

  // Dimensionless coefficients
  cl: UncertaintyBounds;
  cd: UncertaintyBounds;

  // Forces (N)
  lift: UncertaintyBounds;
  drag: UncertaintyBounds;

  // Performance metrics
  efficiency: UncertaintyBounds; // L/D ratio

  // Stability indicators
  stability: "stable" | "marginal" | "unstable";
  stallRisk: "none" | "warning" | "critical";

  // Educational context
  explanation: PhysicsExplanation;

  // Limitations and warnings
  warnings: string[];
  assumptions: string[];
}

export interface PhysicsExplanation {
  regime: string;
  liftMechanism: string;
  dragSources: string;
  keyInsight: string;
  suggestion?: string;
}

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class AerodynamicsEngine {
  /**
   * Main simulation entry point
   */
  static simulate(
    geometry: GeometryDefinition,
    flow: FlowConditions
  ): AerodynamicResults {
    // Step 1: Calculate Reynolds number and classify flow
    const reynolds = ReynoldsCalculator.calculate({
      density: flow.density,
      velocity: flow.velocity,
      characteristicLength: geometry.chord,
    });

    const regime = ReynoldsCalculator.classify(reynolds);

    // Step 2: Calculate dynamic pressure
    const q = 0.5 * flow.density * flow.velocity * flow.velocity;

    // Step 3: Detect flow separation state
    const separation = this.detectSeparation(geometry, reynolds);

    // Step 4: Calculate aerodynamic coefficients
    const coeffs = CoefficientCalculator.calculate(
      {
        thickness: geometry.thickness,
        camber: geometry.camber,
        angleOfAttack: geometry.angleOfAttack,
      },
      reynolds
    );

    // Step 5: Apply separation corrections
    const correctedCoeffs = this.applySeparationCorrections(
      coeffs,
      separation,
      geometry
    );

    // Step 6: Generate uncertainty bounds
    const cl = this.generateBounds(
      correctedCoeffs.cl,
      regime.confidence,
      separation.separationConfidence
    );

    const cd = this.generateBounds(
      correctedCoeffs.cd,
      regime.confidence,
      separation.separationConfidence
    );

    // Step 7: Calculate forces
    const lift = this.calculateForceBounds(cl, q, geometry.area);
    const drag = this.calculateForceBounds(cd, q, geometry.area);

    // Step 8: Calculate efficiency
    const efficiency = this.calculateEfficiency(cl, cd);

    // Step 9: Assess stability and stall risk
    const stability = this.assessStability(geometry, separation.separation);
    const stallRisk = this.assessStallRisk(geometry);

    // Step 10: Generate educational explanation
    const explanation = this.generateExplanation(
      geometry,
      regime,
      separation,
      coeffs
    );

    // Step 11: Compile warnings and assumptions
    const warnings = this.generateWarnings(geometry, regime, separation);
    const assumptions = this.listAssumptions(geometry, flow);

    return {
      // --- ADD THESE 3 LINES FOR THE UI ---
      reynolds: reynolds,
      confidence: regime.confidence,
      regime: { type: regime.regime },
      dynamicPressure: q,
      stability: stability,
      // ------------------------------------

      // Calculate 3D lift vector (pointing up relative to AoA)
      liftVector: {
        x: -Math.sin((geometry.angleOfAttack * Math.PI) / 180) * lift.nominal,
        y: Math.cos((geometry.angleOfAttack * Math.PI) / 180) * lift.nominal,
        z: 0,
      },

      flowState: {
        reynolds,
        regime,
        dynamicPressure: q,
        separation: separation.separation,
        separationConfidence: separation.separationConfidence,
        confidence: regime.confidence,
      },
      cl,
      cd,
      lift,
      drag,
      efficiency,
      stability,
      stallRisk,
      explanation,
      warnings,
      assumptions,
    };
  }

  // ==========================================================================
  // SEPARATION DETECTION
  // ==========================================================================

  /**
   * Heuristic flow separation detection
   * Based on angle of attack, thickness, Reynolds number
   */
  private static detectSeparation(
    geometry: GeometryDefinition,
    reynolds: number
  ): { separation: FlowState["separation"]; separationConfidence: number } {
    const absAngle = Math.abs(geometry.angleOfAttack);

    // Estimate critical angles based on geometry
    const stallAngle = this.estimateStallAngle(geometry.thickness);
    const separationOnsetAngle = stallAngle * 0.7; // Separation starts before full stall

    // Reynolds effects: lower Re → earlier separation
    const reCorrection = Math.min(1, Math.log10(reynolds) / 6);
    const effectiveStallAngle = stallAngle * reCorrection;

    // Determine separation state
    let separation: FlowState["separation"];
    let confidence: number;

    if (absAngle < separationOnsetAngle) {
      separation = "attached";
      confidence = 0.9;
    } else if (absAngle < effectiveStallAngle) {
      separation = "marginal";
      confidence = 0.6;
    } else if (absAngle < effectiveStallAngle * 1.2) {
      separation = "separated";
      confidence = 0.4;
    } else {
      separation = "stalled";
      confidence = 0.3;
    }

    // Reduce confidence for thick airfoils (more complex flow)
    if (geometry.thickness > 0.15) {
      confidence *= 0.8;
    }

    return { separation, separationConfidence: confidence };
  }

  /**
   * Estimate stall angle based on thickness
   * Empirical correlation: thicker airfoils stall earlier
   */
  private static estimateStallAngle(thickness: number): number {
    // Typical range: 12-16° for most airfoils
    return 15 - thickness * 15;
  }

  // ==========================================================================
  // SEPARATION CORRECTIONS
  // ==========================================================================

  /**
   * Apply corrections to coefficients based on separation state
   */
  private static applySeparationCorrections(
    coeffs: Coefficients,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>,
    geometry: GeometryDefinition
  ): Coefficients {
    let cl = coeffs.cl;
    let cd = coeffs.cd;

    switch (separation.separation) {
      case "attached":
        // No correction needed
        break;

      case "marginal":
        // Slight lift reduction, drag increase
        cl *= 0.95;
        cd *= 1.1;
        break;

      case "separated":
        // Significant lift loss, major drag increase
        cl *= 0.7;
        cd *= 1.5;
        break;

      case "stalled":
        // Severe lift loss, very high drag
        const stallFactor = Math.cos(
          (Math.abs(geometry.angleOfAttack) * Math.PI) / 180
        );
        cl *= Math.max(0.3, stallFactor);
        cd *= 2.0;
        break;
    }

    return { cl, cd };
  }

  // ==========================================================================
  // UNCERTAINTY QUANTIFICATION
  // ==========================================================================

  /**
   * Generate uncertainty bounds based on confidence levels
   */
  private static generateBounds(
    nominal: number,
    regimeConfidence: "high" | "medium" | "low",
    separationConfidence: number
  ): UncertaintyBounds {
    // Base uncertainty from regime
    const regimeUncertainty = {
      high: 0.1, // ±10%
      medium: 0.25, // ±25%
      low: 0.4, // ±40%
    }[regimeConfidence];

    // Additional uncertainty from separation
    const separationUncertainty = (1 - separationConfidence) * 0.3;

    // Combined uncertainty
    const totalUncertainty = Math.min(
      0.6, // Cap at ±60%
      regimeUncertainty + separationUncertainty
    );

    // Determine overall confidence
    let confidence: "high" | "medium" | "low";
    if (totalUncertainty < 0.15) {
      confidence = "high";
    } else if (totalUncertainty < 0.35) {
      confidence = "medium";
    } else {
      confidence = "low";
    }

    return {
      min: nominal * (1 - totalUncertainty),
      nominal,
      max: nominal * (1 + totalUncertainty),
      confidence,
    };
  }

  /**
   * Calculate force bounds from coefficient bounds
   */
  private static calculateForceBounds(
    coeffBounds: UncertaintyBounds,
    dynamicPressure: number,
    area: number
  ): UncertaintyBounds {
    const factor = dynamicPressure * area;

    return {
      min: coeffBounds.min * factor,
      nominal: coeffBounds.nominal * factor,
      max: coeffBounds.max * factor,
      confidence: coeffBounds.confidence,
    };
  }

  /**
   * Calculate L/D efficiency bounds
   */
  private static calculateEfficiency(
    cl: UncertaintyBounds,
    cd: UncertaintyBounds
  ): UncertaintyBounds {
    const nominalEfficiency = cl.nominal / Math.max(cd.nominal, 0.001);

    // For efficiency, min/max are inverted due to division
    const minEfficiency = cl.min / Math.max(cd.max, 0.001);
    const maxEfficiency = cl.max / Math.max(cd.min, 0.001);

    // Confidence is minimum of cl and cd confidence
    const confidence =
      cl.confidence === "high" && cd.confidence === "high"
        ? "high"
        : cl.confidence === "low" || cd.confidence === "low"
        ? "low"
        : "medium";

    return {
      min: minEfficiency,
      nominal: nominalEfficiency,
      max: maxEfficiency,
      confidence,
    };
  }

  // ==========================================================================
  // STABILITY AND RISK ASSESSMENT
  // ==========================================================================

  private static assessStability(
    geometry: GeometryDefinition,
    separation: FlowState["separation"]
  ): "stable" | "marginal" | "unstable" {
    const absAngle = Math.abs(geometry.angleOfAttack);

    if (separation === "attached" && absAngle < 10) {
      return "stable";
    } else if (separation === "marginal" || absAngle < 15) {
      return "marginal";
    } else {
      return "unstable";
    }
  }

  private static assessStallRisk(
    geometry: GeometryDefinition
  ): "none" | "warning" | "critical" {
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

  // ==========================================================================
  // EDUCATIONAL EXPLANATIONS
  // ==========================================================================

  private static generateExplanation(
    geometry: GeometryDefinition,
    regime: FlowClassification,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>,
    coeffs: Coefficients
  ): PhysicsExplanation {
    // Regime explanation
    const regimeText = this.explainRegime(regime);

    // Lift mechanism
    const liftText = this.explainLift(geometry, coeffs.cl);

    // Drag sources
    const dragText = this.explainDrag(geometry, coeffs, separation);

    // Key insight
    const insightText = this.generateInsight(geometry, separation, coeffs);

    // Suggestion (if applicable)
    const suggestion = this.generateSuggestion(geometry, separation);

    return {
      regime: regimeText,
      liftMechanism: liftText,
      dragSources: dragText,
      keyInsight: insightText,
      suggestion,
    };
  }

  private static explainRegime(regime: FlowClassification): string {
    switch (regime.regime) {
      case "laminar":
        return "Laminar flow: smooth boundary layer, predictable behaviour. Models are most accurate here.";
      case "transitional":
        return "Transitional flow: boundary layer becoming turbulent. Moderate uncertainty in predictions.";
      case "turbulent":
        return "Turbulent flow: chaotic boundary layer mixing. Empirical models have increased uncertainty.";
      case "separation-likely":
        return "High Reynolds turbulent: separation likely at moderate angles. Predictions less reliable.";
      case "very-low-Re":
        return "Very low Reynolds: viscous forces dominate. Significant uncertainty in thin-airfoil models.";
      default:
        return regime.description;
    }
  }

  private static explainLift(geometry: GeometryDefinition, cl: number): string {
    if (geometry.angleOfAttack > 0) {
      return `Positive angle of attack (${geometry.angleOfAttack.toFixed(
        1
      )}°) deflects flow downward. By Newton's third law, air pushes wing upward. Bernoulli effect also contributes: faster flow over curved top surface creates lower pressure above the wing.`;
    } else if (geometry.angleOfAttack < 0) {
      return `Negative angle of attack (${geometry.angleOfAttack.toFixed(
        1
      )}°) deflects flow upward, creating downforce. This is useful for race car wings and inverted flight.`;
    } else {
      return geometry.camber > 0.01
        ? `At zero angle, lift comes entirely from camber (asymmetric shape). The curved upper surface accelerates flow, creating lower pressure above.`
        : `At zero angle with symmetric airfoil, lift is near zero. Small lift may come from viscous effects or numerical artifacts.`;
    }
  }

  private static explainDrag(
    geometry: GeometryDefinition,
    coeffs: Coefficients,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>
  ): string {
    const sources: string[] = [];

    // Skin friction
    sources.push("Skin friction from viscosity");

    // Induced drag (if lifting)
    if (Math.abs(coeffs.cl) > 0.1) {
      sources.push(
        "Induced drag from generating lift (unavoidable cost of lift)"
      );
    }

    // Pressure drag
    if (Math.abs(geometry.angleOfAttack) > 5) {
      sources.push("Pressure drag from flow deflection at angle");
    }

    // Separation drag
    if (separation.separation !== "attached") {
      sources.push(
        "⚠️ Separation drag from flow breaking away (dominant contribution)"
      );
    }

    return sources.join(" • ");
  }

  private static generateInsight(
    geometry: GeometryDefinition,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>,
    coeffs: Coefficients
  ): string {
    const efficiency = coeffs.cl / Math.max(coeffs.cd, 0.001);

    if (separation.separation === "stalled") {
      return "⚠️ STALLED: Flow has separated from surface. Lift collapsed, drag skyrocketed. Reduce angle immediately.";
    }

    if (separation.separation === "separated") {
      return "⚠️ WARNING: Flow separation detected. Approaching stall. Lift decreasing, drag increasing rapidly.";
    }

    if (efficiency > 20) {
      return `✅ Excellent efficiency (L/D = ${efficiency.toFixed(
        1
      )}). Operating in sweet spot with attached flow.`;
    }

    if (efficiency > 10) {
      return `Good efficiency (L/D = ${efficiency.toFixed(
        1
      )}). Reasonable operating point for most applications.`;
    }

    if (efficiency > 5) {
      return `Moderate efficiency (L/D = ${efficiency.toFixed(
        1
      )}). High drag relative to lift. Consider optimizing angle or geometry.`;
    }

    return `⚠️ Poor efficiency (L/D = ${efficiency.toFixed(
      1
    )}). Drag dominates. Check for separation or excessive angle.`;
  }

  private static generateSuggestion(
    geometry: GeometryDefinition,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>
  ): string | undefined {
    if (
      separation.separation === "stalled" ||
      separation.separation === "separated"
    ) {
      return "Reduce angle of attack to recover attached flow and restore lift.";
    }

    const absAngle = Math.abs(geometry.angleOfAttack);
    const stallAngle = this.estimateStallAngle(geometry.thickness);

    if (absAngle > stallAngle * 0.8) {
      return `Approaching stall angle (~${stallAngle.toFixed(
        1
      )}°). Monitor flow carefully.`;
    }

    if (geometry.thickness > 0.18) {
      return "Very thick airfoil may have increased drag and early separation. Consider reducing thickness for efficiency.";
    }

    return undefined;
  }

  // ==========================================================================
  // WARNINGS AND ASSUMPTIONS
  // ==========================================================================

  private static generateWarnings(
    geometry: GeometryDefinition,
    regime: FlowClassification,
    separation: ReturnType<typeof AerodynamicsEngine.detectSeparation>
  ): string[] {
    const warnings: string[] = [];

    // Separation warnings
    if (separation.separation === "stalled") {
      warnings.push(
        "CRITICAL: Flow is fully stalled. Results highly uncertain."
      );
    } else if (separation.separation === "separated") {
      warnings.push(
        "WARNING: Flow separation detected. Increased uncertainty."
      );
    }

    // Regime warnings
    if (regime.confidence === "low") {
      warnings.push(
        `Low confidence in ${regime.regime} regime. Results may deviate significantly from reality.`
      );
    }

    // Geometry warnings
    if (geometry.thickness > 0.2) {
      warnings.push("Very thick airfoil: thin-airfoil theory less accurate.");
    }

    if (Math.abs(geometry.angleOfAttack) > 20) {
      warnings.push(
        "Extreme angle of attack: models not validated at this range."
      );
    }

    // Reynolds warnings
    if (regime.regime === "very-low-Re") {
      warnings.push(
        "Very low Reynolds: laminar separation likely. Results approximate."
      );
    }

    return warnings;
  }

  private static listAssumptions(
    geometry: GeometryDefinition,
    flow: FlowConditions
  ): string[] {
    return [
      "Incompressible flow (Mach << 0.3)",
      "Steady-state conditions (no gusts or maneuvers)",
      "Newtonian fluid (air)",
      "2D flow (infinite wingspan, no tip effects)",
      "Thin airfoil theory for lift",
      "Empirical drag correlations",
      "Heuristic separation detection",
      "No surface roughness or manufacturing defects",
      "Clean flow (no rain, ice, or bugs)",
    ];
  }
}

// ============================================================================
// CONVENIENCE WRAPPER FOR BACKWARD COMPATIBILITY
// ============================================================================

export interface LegacySimulationParams {
  velocity: number;
  density: number;
  area: number;
  length: number;
  angleOfAttack: number;
  thickness: number;
  camber: number;
  geometry: "symmetric" | "cambered" | "flat-plate";
}

/**
 * Legacy wrapper for existing codebase
 */
export function simulateLegacy(
  params: LegacySimulationParams
): AerodynamicResults {
  return AerodynamicsEngine.simulate(
    {
      type: params.geometry,
      chord: params.length,
      thickness: params.thickness,
      camber: params.camber,
      angleOfAttack: params.angleOfAttack,
      area: params.area,
    },
    {
      velocity: params.velocity,
      density: params.density,
    }
  );
}

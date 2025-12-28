/**
 * EDUCATIONAL PHYSICS ENGINE (FREE VERSION)
 * ==========================================
 *
 * INTENTIONALLY SIMPLIFIED for student learning.
 * NOT accurate. NOT professional. HONEST about limitations.
 *
 * Goals:
 * - Cause → Effect is obvious
 * - Behavior is predictable
 * - No subtle effects or surprises
 * - Stable across all parameter ranges
 */

import { ReynoldsCalculator, FlowClassification } from "./reynolds";
import { CoefficientCalculator } from "./coefficients";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FlowConditions {
  velocity: number;
  density: number;
  viscosity?: number;
}

export interface GeometryDefinition {
  type: "symmetric" | "cambered" | "flat-plate";
  chord: number;
  thickness: number;
  camber: number;
  angleOfAttack: number;
  area: number;
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
  dynamicPressure: number;
  separation: "attached" | "marginal" | "separated" | "stalled";
  separationConfidence: number;
  confidence: "high" | "medium" | "low";
}

export interface AerodynamicResults {
  flowState: FlowState;
  dynamicPressure: number;
  reynolds: number;
  confidence: "high" | "medium" | "low";
  regime: { type: string };
  liftVector: { x: number; y: number; z: number };
  cl: UncertaintyBounds;
  cd: UncertaintyBounds;
  lift: UncertaintyBounds;
  drag: UncertaintyBounds;
  efficiency: UncertaintyBounds;
  stability: "stable" | "marginal" | "unstable";
  stallRisk: "none" | "warning" | "critical";
  explanation: PhysicsExplanation;
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
// CLAMPED CONSTANTS (EDUCATIONAL SIMPLIFICATION)
// ============================================================================

const CLAMPS = {
  // Angle of attack limits (beyond these, behavior is unpredictable)
  MIN_ANGLE: -15,
  MAX_ANGLE: 20,
  STALL_ANGLE_BASE: 14, // Fixed stall angle (simplified)

  // Coefficient limits (prevents unrealistic values)
  MAX_CL: 1.8,
  MIN_CL: -1.5,
  MIN_CD: 0.008,
  MAX_CD: 2.0,

  // Physical limits
  MIN_VELOCITY: 5,
  MAX_VELOCITY: 60,
  MIN_THICKNESS: 0.05,
  MAX_THICKNESS: 0.25,
};

// ============================================================================
// MAIN ENGINE CLASS
// ============================================================================

export class AerodynamicsEngine {
  /**
   * Main simulation entry point (CLAMPED & SIMPLIFIED)
   */
  static simulate(
    geometry: GeometryDefinition,
    flow: FlowConditions
  ): AerodynamicResults {
    // Step 1: Clamp all inputs to safe ranges
    const clampedGeometry = this.clampGeometry(geometry);
    const clampedFlow = this.clampFlow(flow);

    // Step 2: Calculate Reynolds (educational range only)
    const reynolds = ReynoldsCalculator.calculate({
      density: clampedFlow.density,
      velocity: clampedFlow.velocity,
      characteristicLength: clampedGeometry.chord,
    });

    const regime = ReynoldsCalculator.classify(reynolds);

    // Step 3: Dynamic pressure
    const q = 0.5 * clampedFlow.density * clampedFlow.velocity ** 2;

    // Step 4: Simplified separation detection
    const separation = this.detectSeparationSimple(clampedGeometry);

    // Step 5: Calculate coefficients (with hard clamps)
    const rawCoeffs = CoefficientCalculator.calculate(
      {
        thickness: clampedGeometry.thickness,
        camber: clampedGeometry.camber,
        angleOfAttack: clampedGeometry.angleOfAttack,
      },
      reynolds
    );

    const coeffs = {
      cl: this.clampValue(rawCoeffs.cl, CLAMPS.MIN_CL, CLAMPS.MAX_CL),
      cd: this.clampValue(rawCoeffs.cd, CLAMPS.MIN_CD, CLAMPS.MAX_CD),
    };

    // Apply separation corrections (simplified)
    const correctedCoeffs = this.applySeparationCorrectionsSimple(
      coeffs,
      separation
    );

    // Step 6: Fixed uncertainty (no complex calculations)
    const cl = this.fixedBounds(correctedCoeffs.cl, 0.15); // ±15%
    const cd = this.fixedBounds(correctedCoeffs.cd, 0.15);

    // Step 7: Forces
    const lift = this.calculateForceBounds(cl, q, clampedGeometry.area);
    const drag = this.calculateForceBounds(cd, q, clampedGeometry.area);

    // Step 8: Efficiency
    const efficiency = this.calculateEfficiency(cl, cd);

    // Step 9: Stability (simplified logic)
    const stability = this.assessStabilitySimple(clampedGeometry, separation);
    const stallRisk = this.assessStallRiskSimple(clampedGeometry);

    // Step 10: Educational explanation (plain language)
    const explanation = this.generateSimpleExplanation(
      clampedGeometry,
      separation,
      coeffs
    );

    // Step 11: Simple warnings
    const warnings = this.generateSimpleWarnings(clampedGeometry, separation);
    const assumptions = this.listSimpleAssumptions();

    return {
      reynolds,
      confidence: "medium", // Always medium for educational version
      regime: { type: regime.regime },
      dynamicPressure: q,
      stability,
      liftVector: {
        x:
          -Math.sin((clampedGeometry.angleOfAttack * Math.PI) / 180) *
          lift.nominal,
        y:
          Math.cos((clampedGeometry.angleOfAttack * Math.PI) / 180) *
          lift.nominal,
        z: 0,
      },
      flowState: {
        reynolds,
        regime,
        dynamicPressure: q,
        separation,
        separationConfidence: 0.7, // Fixed confidence
        confidence: "medium",
      },
      cl,
      cd,
      lift,
      drag,
      efficiency,
      stallRisk,
      explanation,
      warnings,
      assumptions,
    };
  }

  // ==========================================================================
  // CLAMPING FUNCTIONS
  // ==========================================================================

  private static clampGeometry(geom: GeometryDefinition): GeometryDefinition {
    return {
      ...geom,
      angleOfAttack: this.clampValue(
        geom.angleOfAttack,
        CLAMPS.MIN_ANGLE,
        CLAMPS.MAX_ANGLE
      ),
      thickness: this.clampValue(
        geom.thickness,
        CLAMPS.MIN_THICKNESS,
        CLAMPS.MAX_THICKNESS
      ),
      camber: this.clampValue(geom.camber, 0, 0.08),
    };
  }

  private static clampFlow(flow: FlowConditions): FlowConditions {
    return {
      ...flow,
      velocity: this.clampValue(
        flow.velocity,
        CLAMPS.MIN_VELOCITY,
        CLAMPS.MAX_VELOCITY
      ),
    };
  }

  private static clampValue(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  // ==========================================================================
  // SIMPLIFIED SEPARATION DETECTION
  // ==========================================================================

  private static detectSeparationSimple(
    geom: GeometryDefinition
  ): "attached" | "marginal" | "separated" | "stalled" {
    const absAngle = Math.abs(geom.angleOfAttack);
    const stallAngle = CLAMPS.STALL_ANGLE_BASE;

    if (absAngle < stallAngle * 0.6) return "attached";
    if (absAngle < stallAngle * 0.85) return "marginal";
    if (absAngle < stallAngle) return "separated";
    return "stalled";
  }

  // ==========================================================================
  // SIMPLIFIED SEPARATION CORRECTIONS
  // ==========================================================================

  private static applySeparationCorrectionsSimple(
    coeffs: { cl: number; cd: number },
    separation: "attached" | "marginal" | "separated" | "stalled"
  ): { cl: number; cd: number } {
    let cl = coeffs.cl;
    let cd = coeffs.cd;

    switch (separation) {
      case "attached":
        break;
      case "marginal":
        cl *= 0.9;
        cd *= 1.15;
        break;
      case "separated":
        cl *= 0.6;
        cd *= 1.4;
        break;
      case "stalled":
        cl *= 0.3;
        cd *= 1.8;
        break;
    }

    return { cl, cd };
  }

  // ==========================================================================
  // FIXED UNCERTAINTY BOUNDS (NO COMPLEX CALCULATIONS)
  // ==========================================================================

  private static fixedBounds(
    nominal: number,
    uncertainty: number
  ): UncertaintyBounds {
    return {
      min: nominal * (1 - uncertainty),
      nominal,
      max: nominal * (1 + uncertainty),
      confidence: "medium",
    };
  }

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

  private static calculateEfficiency(
    cl: UncertaintyBounds,
    cd: UncertaintyBounds
  ): UncertaintyBounds {
    const nominalEfficiency = cl.nominal / Math.max(cd.nominal, 0.001);
    return {
      min: cl.min / Math.max(cd.max, 0.001),
      nominal: nominalEfficiency,
      max: cl.max / Math.max(cd.min, 0.001),
      confidence: "medium",
    };
  }

  // ==========================================================================
  // SIMPLIFIED STABILITY & RISK
  // ==========================================================================

  private static assessStabilitySimple(
    geom: GeometryDefinition,
    separation: "attached" | "marginal" | "separated" | "stalled"
  ): "stable" | "marginal" | "unstable" {
    if (separation === "attached") return "stable";
    if (separation === "marginal" || separation === "separated")
      return "marginal";
    return "unstable";
  }

  private static assessStallRiskSimple(
    geom: GeometryDefinition
  ): "none" | "warning" | "critical" {
    const absAngle = Math.abs(geom.angleOfAttack);
    const stallAngle = CLAMPS.STALL_ANGLE_BASE;

    if (absAngle < stallAngle * 0.6) return "none";
    if (absAngle < stallAngle) return "warning";
    return "critical";
  }

  // ==========================================================================
  // PLAIN-LANGUAGE EXPLANATIONS
  // ==========================================================================

  private static generateSimpleExplanation(
    geom: GeometryDefinition,
    separation: "attached" | "marginal" | "separated" | "stalled",
    coeffs: { cl: number; cd: number }
  ): PhysicsExplanation {
    const angle = geom.angleOfAttack;
    const absAngle = Math.abs(angle);

    let liftText = "";
    if (angle > 2) {
      liftText = `At ${angle.toFixed(
        1
      )}°, air is deflected downward. Wing pushes up.`;
    } else if (angle < -2) {
      liftText = `Negative angle creates downforce (pushes wing down).`;
    } else {
      liftText = `Near zero angle = minimal lift.`;
    }

    let dragText = "Drag comes from air friction and flow deflection.";
    if (separation !== "attached") {
      dragText += " ⚠️ Flow separation adds extra drag.";
    }

    let insight = "";
    if (separation === "stalled") {
      insight = "🚨 STALLED: Reduce angle immediately!";
    } else if (separation === "separated") {
      insight = "⚠️ Flow breaking away. Getting close to stall.";
    } else {
      const efficiency = coeffs.cl / Math.max(coeffs.cd, 0.001);
      insight =
        efficiency > 15
          ? "✅ Good efficiency. Flow is smooth."
          : efficiency > 8
          ? "Moderate efficiency. Could be better."
          : "Low efficiency. Check angle and shape.";
    }

    let suggestion;
    if (separation !== "attached") {
      suggestion = "Try reducing the angle of attack.";
    } else if (absAngle < 3) {
      suggestion = "Increase angle to generate more lift.";
    }

    return {
      regime: "Simplified educational model",
      liftMechanism: liftText,
      dragSources: dragText,
      keyInsight: insight,
      suggestion,
    };
  }

  private static generateSimpleWarnings(
    geom: GeometryDefinition,
    separation: "attached" | "marginal" | "separated" | "stalled"
  ): string[] {
    const warnings: string[] = [];

    if (separation === "stalled") {
      warnings.push("STALL DETECTED: Results are approximate.");
    } else if (separation === "separated") {
      warnings.push("Flow separation active.");
    }

    if (Math.abs(geom.angleOfAttack) > 15) {
      warnings.push("Extreme angle: behavior simplified.");
    }

    return warnings;
  }

  private static listSimpleAssumptions(): string[] {
    return [
      "Simplified educational model (not accurate)",
      "2D flow (no wing tips)",
      "Steady conditions (no gusts)",
      "Clean airfoil (no dirt or ice)",
      "For learning only - NOT for real designs",
    ];
  }
}

// ============================================================================
// LEGACY WRAPPER
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

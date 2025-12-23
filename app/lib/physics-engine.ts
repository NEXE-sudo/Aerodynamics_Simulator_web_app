import {
  SimulationParams,
  SimulationResults,
  ValueRange,
  FlowRegime,
  Confidence,
} from "../types";

export class PhysicsEngine {
  static calculateReynolds(
    velocity: number,
    length: number,
    density = 1.225,
    viscosity = 1.81e-5
  ): number {
    return (density * velocity * length) / viscosity;
  }

  static classifyFlowRegime(reynolds: number): FlowRegime {
    if (reynolds < 5e5) return { type: "laminar", confidence: "high" };
    if (reynolds < 1e6) return { type: "transitional", confidence: "medium" };
    if (reynolds < 3e6) return { type: "turbulent", confidence: "medium" };
    return { type: "separation-likely", confidence: "low" };
  }

  static calculateLiftCoefficient(
    angleOfAttack: number,
    camber: number,
    thickness: number,
    reynolds: number
  ): number {
    const alpha = (angleOfAttack * Math.PI) / 180;
    const liftSlope = 2 * Math.PI;
    const camberLift = camber * Math.PI;
    const thicknessCorrection = 1 - 0.3 * thickness;
    const reynoldsCorrection = Math.min(1, Math.log10(reynolds) / 6);
    const stallAngle = 15 - thickness * 10;
    const stallFactor =
      Math.abs(angleOfAttack) > stallAngle ? Math.cos(alpha * 2) * 0.5 : 1;

    return (
      (liftSlope * alpha + camberLift) *
      thicknessCorrection *
      reynoldsCorrection *
      stallFactor
    );
  }

  static calculateDragCoefficient(
    angleOfAttack: number,
    thickness: number,
    camber: number,
    reynolds: number
  ): number {
    const alpha = Math.abs((angleOfAttack * Math.PI) / 180);
    const cd0 = 0.006 + thickness * 0.02;
    const cl = this.calculateLiftCoefficient(
      angleOfAttack,
      camber,
      thickness,
      reynolds
    );
    const aspectRatio = 6;
    const cdi = (cl * cl) / (Math.PI * aspectRatio * 0.85);
    const cdp = Math.sin(alpha) * Math.sin(alpha) * 0.1;
    const cf = 0.074 / Math.pow(reynolds, 0.2);

    return cd0 + cdi + cdp + cf;
  }

  static calculateForces(
    velocity: number,
    density: number,
    area: number,
    cl: number,
    cd: number
  ) {
    const q = 0.5 * density * velocity * velocity;
    const lift = q * area * cl;
    const drag = q * area * cd;

    return { lift, drag, dynamicPressure: q };
  }

  static generateBounds(value: number, confidence: Confidence): ValueRange {
    const uncertainty = {
      high: 0.1,
      medium: 0.25,
      low: 0.4,
    };

    const factor = uncertainty[confidence] || 0.3;
    return {
      min: value * (1 - factor),
      max: value * (1 + factor),
      nominal: value,
    };
  }

  static simulate(params: SimulationParams): SimulationResults {
    const {
      velocity,
      density,
      area,
      length,
      angleOfAttack,
      thickness,
      camber,
    } = params;

    const reynolds = this.calculateReynolds(velocity, length, density);
    const regime = this.classifyFlowRegime(reynolds);

    const cl = this.calculateLiftCoefficient(
      angleOfAttack,
      camber,
      thickness,
      reynolds
    );
    const cd = this.calculateDragCoefficient(
      angleOfAttack,
      thickness,
      camber,
      reynolds
    );

    const forces = this.calculateForces(velocity, density, area, cl, cd);
    const efficiency = cl / Math.max(cd, 0.001);

    const stability =
      Math.abs(angleOfAttack) < 10
        ? "stable"
        : Math.abs(angleOfAttack) < 15
        ? "marginal"
        : "unstable";

    return {
      reynolds,
      regime,
      cl: this.generateBounds(cl, regime.confidence),
      cd: this.generateBounds(cd, regime.confidence),
      lift: this.generateBounds(forces.lift, regime.confidence),
      drag: this.generateBounds(forces.drag, regime.confidence),
      efficiency: this.generateBounds(efficiency, regime.confidence),
      dynamicPressure: forces.dynamicPressure,
      stability: stability as any,
      confidence: regime.confidence,
    };
  }
}

import { Point } from "../../types";
import { CFDFlowSolver } from "../physics/cfd-simple";

export class FlowField {
  static generateStreamlines(
    geometry: Point[],
    velocity: number,
    angleOfAttack: number,
    numLines = 15
  ): Point[][] {
    // Use the new CFD solver
    const flowField = CFDFlowSolver.calculateVelocityField(
      geometry,
      velocity,
      angleOfAttack,
      40 // grid resolution
    );

    const streamlinesData = CFDFlowSolver.generateStreamlines(
      flowField,
      velocity,
      angleOfAttack,
      geometry,
      numLines
    );

    // Return just the points for now (compatibility)
    return streamlinesData.map((sl) => sl.points);
  }

  static generateStreamlinesWithData(
    geometry: Point[],
    velocity: number,
    angleOfAttack: number,
    numLines = 15
  ): { points: Point[]; speeds: number[]; pressures: number[] }[] {
    // New method that returns full data
    const flowField = CFDFlowSolver.calculateVelocityField(
      geometry,
      velocity,
      angleOfAttack,
      40
    );

    return CFDFlowSolver.generateStreamlines(
      flowField,
      velocity,
      angleOfAttack,
      geometry,
      numLines
    );
  }

  static calculatePressureField(
    geometry: Point[],
    velocity: number,
    density: number
  ): number[] {
    return geometry.map((point) => {
      const localVelocity = velocity * (1 + 0.5 * Math.sin(point.y * Math.PI));
      const pressure =
        0.5 * density * (velocity * velocity - localVelocity * localVelocity);
      return pressure;
    });
  }
}

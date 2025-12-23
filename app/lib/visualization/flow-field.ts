import { Point } from "../../types";

export class FlowField {
  static generateStreamlines(
    geometry: Point[],
    velocity: number,
    angleOfAttack: number,
    numLines = 15
  ): Point[][] {
    const streamlines: Point[][] = [];
    const alpha = (angleOfAttack * Math.PI) / 180;

    for (let i = 0; i < numLines; i++) {
      const startY = -0.5 + (i / (numLines - 1)) * 1;
      const line: Point[] = [];

      let x = -0.5;
      let y = startY;

      for (let step = 0; step < 150; step++) {
        line.push({ x, y });

        const dx = 0.01;
        const distToAirfoil = Math.min(
          ...geometry.map((p) =>
            Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y))
          )
        );

        if (distToAirfoil < 0.05) break;

        const deflection = Math.exp(-distToAirfoil * 5) * Math.sin(alpha) * 0.1;

        x += dx;
        y += deflection;

        if (x > 1.5 || Math.abs(y) > 0.8) break;
      }

      if (line.length > 10) streamlines.push(line);
    }

    return streamlines;
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

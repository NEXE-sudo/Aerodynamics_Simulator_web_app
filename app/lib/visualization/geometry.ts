import { Point, GeometryType } from "../../types";

export class GeometryGenerator {
  static generateAirfoil(
    type: GeometryType,
    params: { thickness: number; camber: number }
  ): Point[] {
    const points: Point[] = [];
    const n = 100;

    for (let i = 0; i <= n; i++) {
      const x = i / n;
      let y = 0;

      if (type === "symmetric") {
        const t = params.thickness;
        y =
          5 *
          t *
          (0.2969 * Math.sqrt(x) -
            0.126 * x -
            0.3516 * x * x +
            0.2843 * x * x * x -
            0.1015 * x * x * x * x);
      } else if (type === "cambered") {
        const m = params.camber;
        const p = 0.4;
        const t = params.thickness;

        const yc =
          x < p
            ? (m / (p * p)) * (2 * p * x - x * x)
            : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);

        const yt =
          5 *
          t *
          (0.2969 * Math.sqrt(x) -
            0.126 * x -
            0.3516 * x * x +
            0.2843 * x * x * x -
            0.1015 * x * x * x * x);

        y = yc + yt;
      } else if (type === "flat-plate") {
        y = 0;
      }

      points.push({ x, y });
    }

    // Add lower surface
    if (type !== "flat-plate") {
      for (let i = n - 1; i >= 0; i--) {
        const x = i / n;
        let y = 0;

        if (type === "symmetric") {
          const t = params.thickness;
          y =
            -5 *
            t *
            (0.2969 * Math.sqrt(x) -
              0.126 * x -
              0.3516 * x * x +
              0.2843 * x * x * x -
              0.1015 * x * x * x * x);
        } else if (type === "cambered") {
          const m = params.camber;
          const p = 0.4;
          const t = params.thickness;

          const yc =
            x < p
              ? (m / (p * p)) * (2 * p * x - x * x)
              : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);

          const yt =
            5 *
            t *
            (0.2969 * Math.sqrt(x) -
              0.126 * x -
              0.3516 * x * x +
              0.2843 * x * x * x -
              0.1015 * x * x * x * x);

          y = yc - yt;
        }

        points.push({ x, y });
      }
    }

    return points;
  }

  static generateCylinder(radius: number): Point[] {
    const points: Point[] = [];
    const n = 50;

    for (let i = 0; i <= n; i++) {
      const theta = (i / n) * 2 * Math.PI;
      points.push({
        x: 0.5 + radius * Math.cos(theta),
        y: radius * Math.sin(theta),
      });
    }

    return points;
  }
}

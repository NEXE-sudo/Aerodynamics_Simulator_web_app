/**
 * SpatialHash.ts
 * ==============
 * Spatial acceleration structure for collision detection.
 *
 * Divides 3D space into grid cells to avoid O(n²) collision checks.
 * Unchanged from original implementation.
 */

interface CollisionObject {
  center: [number, number, number];
  radius: number;
  normal: [number, number, number];
}

export class SpatialHash {
  private grid: Map<string, CollisionObject[]> = new Map();
  private cellSize: number;

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  clear(): void {
    this.grid.clear();
  }

  insert(object: CollisionObject): void {
    const key = this.getCellKey(object.center);
    if (!this.grid.has(key)) this.grid.set(key, []);
    this.grid.get(key)!.push(object);
  }

  querySphere(
    position: [number, number, number],
    radius: number
  ): CollisionObject | null {
    const cell = this.getCellKey(position);
    const candidates = this.grid.get(cell) || [];

    for (const obj of candidates) {
      const dist = Math.sqrt(
        Math.pow(position[0] - obj.center[0], 2) +
          Math.pow(position[1] - obj.center[1], 2) +
          Math.pow(position[2] - obj.center[2], 2)
      );
      if (dist < radius + obj.radius) {
        return obj;
      }
    }
    return null;
  }

  private getCellKey(pos: [number, number, number]): string {
    const x = Math.floor(pos[0] / this.cellSize);
    const y = Math.floor(pos[1] / this.cellSize);
    const z = Math.floor(pos[2] / this.cellSize);
    return `${x},${y},${z}`;
  }
}

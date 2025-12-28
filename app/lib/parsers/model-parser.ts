export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export const parseOBJ = (buffer: ArrayBuffer): Point3D[] => {
  const text = new TextDecoder().decode(buffer);
  const lines = text.split("\n");
  const vertices: Point3D[] = [];

  lines.forEach((line) => {
    const parts = line.trim().split(/\s+/);
    if (parts[0] === "v") {
      vertices.push({
        x: parseFloat(parts[1]),
        y: parseFloat(parts[2]),
        z: parseFloat(parts[3]),
      });
    }
  });
  return vertices;
};

export const parseSTL = (buffer: ArrayBuffer): Point3D[] => {
  const data = new DataView(buffer);
  const triangles = data.getUint32(80, true);
  const vertices: Point3D[] = [];

  let offset = 84;
  for (let i = 0; i < triangles; i++) {
    offset += 12; // Skip normal
    for (let j = 0; j < 3; j++) {
      vertices.push({
        x: data.getFloat32(offset, true),
        y: data.getFloat32(offset + 4, true),
        z: data.getFloat32(offset + 8, true),
      });
      offset += 12;
    }
    offset += 2; // Attribute byte count
  }
  return vertices;
};

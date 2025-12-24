export type Mode = "learning" | "design" | "comparison";
export type GeometryType = "flat-plate" | "symmetric" | "cambered";
export type Confidence = "high" | "medium" | "low";
export type Stability = "stable" | "marginal" | "unstable";

export interface SimulationParams {
  velocity: number;
  density: number;
  area: number;
  length: number;
  angleOfAttack: number;
  thickness: number;
  camber: number;
  geometry: GeometryType;
}

export interface ValueRange {
  min: number;
  max: number;
  nominal: number;
}

export interface FlowRegime {
  type: string;
  confidence: Confidence;
}

export interface SimulationResults {
  reynolds: number;
  regime: FlowRegime;
  cl: ValueRange;
  cd: ValueRange;
  lift: ValueRange;
  drag: ValueRange;
  efficiency: ValueRange;
  dynamicPressure: number;
  stability: Stability;
  confidence: Confidence;
}

export interface Point {
  x: number;
  y: number;
}

export interface UploadedModel {
  file: File;
  url: string;
  name: string;
  type: ".glb" | ".gltf" | ".obj" | ".stl";
}

export type ModelSource = "generated" | "uploaded";

export type ProjectionFace =
  | "xy-top"
  | "xy-bottom"
  | "xz-front"
  | "xz-back"
  | "yz-left"
  | "yz-right";

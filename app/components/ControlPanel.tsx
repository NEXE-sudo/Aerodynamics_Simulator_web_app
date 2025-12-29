/**
 * ControlPanel.tsx
 * ================
 * User controls for simulation parameters.
 *
 * Changes:
 * - Removed showStreamlines toggle
 * - Removed onShowStreamlinesChange prop
 * - Cleaner interface with single animation toggle
 */

import { Mode, GeometryType } from "../types";
import { Settings, RotateCw } from "lucide-react";
import SliderInput from "./ui/SliderInput";

interface ControlPanelProps {
  mode: Mode;
  geometryType: GeometryType;
  thickness: number;
  camber: number;
  velocity: number;
  angleOfAttack: number;
  density: number;
  length: number;
  area: number;
  isAnimating: boolean;
  onGeometryTypeChange: (type: GeometryType) => void;
  onThicknessChange: (v: number) => void;
  onCamberChange: (v: number) => void;
  onVelocityChange: (v: number) => void;
  onAngleChange: (v: number) => void;
  onDensityChange: (v: number) => void;
  onLengthChange: (v: number) => void;
  onAreaChange: (v: number) => void;
  onAnimatingChange: (v: boolean) => void;
}

const SIMPLE_RANGES = {
  angle: { min: -15, max: 20, step: 1 },
  velocity: { min: 10, max: 50, step: 2 },
  thickness: { min: 0.08, max: 0.2, step: 0.02 },
  camber: { min: 0, max: 0.06, step: 0.01 },
};

export default function ControlPanel(props: ControlPanelProps) {
  const handleReset = () => {
    props.onAngleChange(5);
    props.onVelocityChange(20);
    props.onThicknessChange(0.12);
    props.onCamberChange(0.02);
    props.onGeometryTypeChange("symmetric");
    props.onAnimatingChange(true);
  };

  return (
    <div className="w-full h-fit p-6 space-y-5 text-sm bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-lg">
      {/* Header with Reset */}
      <div className="flex items-center justify-between pb-4 border-b-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
          <Settings size={20} className="text-teal-600 dark:text-teal-400" />
          <h3 className="text-lg font-bold">Controls</h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-4 py-2 text-xs bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-lg transition-all font-semibold shadow-md hover:shadow-lg active:scale-95"
          title="Reset to defaults"
        >
          <RotateCw size={14} />
          Reset
        </button>
      </div>

      {/* Geometry Type */}
      <div>
        <label className="font-medium text-gray-900 dark:text-gray-100 block mb-2">
          Airfoil Shape
        </label>
        <select
          value={props.geometryType}
          onChange={(e) =>
            props.onGeometryTypeChange(e.target.value as GeometryType)
          }
          className="w-full rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all font-medium text-gray-900 dark:text-gray-100"
        >
          <option value="symmetric">Symmetric (balanced)</option>
          <option value="cambered">Cambered (curved)</option>
          <option value="flat-plate">Flat Plate (simple)</option>
        </select>
      </div>

      {/* Main Controls */}
      <div className="space-y-4 pt-2">
        <SliderInput
          label="Angle of Attack"
          value={props.angleOfAttack}
          min={SIMPLE_RANGES.angle.min}
          max={SIMPLE_RANGES.angle.max}
          step={SIMPLE_RANGES.angle.step}
          unit="°"
          onChange={props.onAngleChange}
        />

        <SliderInput
          label="Wind Speed"
          value={props.velocity}
          min={SIMPLE_RANGES.velocity.min}
          max={SIMPLE_RANGES.velocity.max}
          step={SIMPLE_RANGES.velocity.step}
          unit="m/s"
          onChange={props.onVelocityChange}
        />

        <SliderInput
          label="Thickness"
          value={props.thickness}
          min={SIMPLE_RANGES.thickness.min}
          max={SIMPLE_RANGES.thickness.max}
          step={SIMPLE_RANGES.thickness.step}
          onChange={props.onThicknessChange}
        />

        <SliderInput
          label="Camber (Curve)"
          value={props.camber}
          min={SIMPLE_RANGES.camber.min}
          max={SIMPLE_RANGES.camber.max}
          step={SIMPLE_RANGES.camber.step}
          onChange={props.onCamberChange}
        />
      </div>

      {/* Animation Toggle */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => props.onAnimatingChange(!props.isAnimating)}
          className={`w-full rounded-lg px-4 py-2.5 font-medium transition ${
            props.isAnimating
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          {props.isAnimating ? "⏸ Pause Animation" : "▶ Play Animation"}
        </button>
      </div>

      {/* Educational Note */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          💡 <strong>Tip:</strong> Watch particle colors change with angle and
          speed. Blue particles are slower, yellow particles are faster.
        </div>
      </div>
    </div>
  );
}

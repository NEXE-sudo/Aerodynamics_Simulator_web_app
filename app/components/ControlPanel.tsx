import { Mode, GeometryType } from "../types";
import { Settings, Info } from "lucide-react";
import SliderInput from "./ui/SliderInput"; // Ensure you created this file

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
  showStreamlines: boolean;
  isAnimating: boolean;
  // Handlers
  onGeometryTypeChange: (type: GeometryType) => void;
  onThicknessChange: (v: number) => void;
  onCamberChange: (v: number) => void;
  onVelocityChange: (v: number) => void;
  onAngleChange: (v: number) => void;
  onDensityChange: (v: number) => void;
  onLengthChange: (v: number) => void;
  onAreaChange: (v: number) => void;
  onShowStreamlinesChange: (v: boolean) => void;
  onAnimatingChange: (v: boolean) => void;
}

const controlsConfig = {
  learning: {
    angle: { min: -10, max: 15, step: 1 },
    velocity: { min: 10, max: 40, step: 1 },
    thickness: { min: 0.08, max: 0.18, step: 0.01 },
    camber: { min: 0, max: 0.04, step: 0.005 },
    disabled: ["density", "length", "area"],
  },
  design: {
    angle: { min: -20, max: 20, step: 0.5 },
    velocity: { min: 5, max: 80, step: 1 },
    thickness: { min: 0.06, max: 0.25, step: 0.01 },
    camber: { min: 0, max: 0.08, step: 0.001 },
    disabled: [],
  },
  comparison: {
    angle: { min: -20, max: 20, step: 0.5 },
    velocity: { min: 5, max: 80, step: 1 },
    thickness: { min: 0.06, max: 0.25, step: 0.01 },
    camber: { min: 0, max: 0.08, step: 0.001 },
    disabled: [],
  },
};

export default function ControlPanel(props: ControlPanelProps) {
  const config = controlsConfig[props.mode];
  const isDisabled = (key: string) => config.disabled.includes(key);

  return (
    <div className="w-full h-fit p-5 space-y-6 text-sm bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
      {/* Geometry Type */}
      <div>
        <label className="font-medium text-gray-900 dark:text-gray-100">
          Geometry Type
        </label>
        <select
          value={props.geometryType}
          onChange={(e) =>
            props.onGeometryTypeChange(e.target.value as GeometryType)
          }
          className="w-full rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-all font-medium text-gray-900 dark:text-gray-100"
        >
          <option value="symmetric">Symmetric Airfoil</option>
          <option value="cambered">Cambered Airfoil</option>
          <option value="flat-plate">Flat Plate</option>
        </select>
      </div>

      <div className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold">
        <Settings size={16} />
        Simulation Controls
      </div>

      <SliderInput
        label="Angle of Attack"
        value={props.angleOfAttack}
        min={config.angle.min}
        max={config.angle.max}
        step={config.angle.step}
        unit="°"
        onChange={props.onAngleChange}
      />

      <SliderInput
        label="Velocity"
        value={props.velocity}
        min={config.velocity.min}
        max={config.velocity.max}
        step={config.velocity.step}
        unit="m/s"
        onChange={props.onVelocityChange}
      />

      <SliderInput
        label="Thickness"
        value={props.thickness}
        min={config.thickness.min}
        max={config.thickness.max}
        step={config.thickness.step}
        onChange={props.onThicknessChange}
      />

      <SliderInput
        label="Camber"
        value={props.camber}
        min={config.camber.min}
        max={config.camber.max}
        step={config.camber.step}
        onChange={props.onCamberChange}
      />

      {!isDisabled("density") && (
        <div>
          <label className="font-medium text-gray-900 dark:text-gray-100">
            Air Density: {props.density.toFixed(2)} kg/m³
          </label>
          <input
            type="number"
            value={props.density}
            onChange={(e) => props.onDensityChange(parseFloat(e.target.value))}
            className="w-full rounded-lg px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
          />
        </div>
      )}

      {/* Toggles */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={() => props.onShowStreamlinesChange(!props.showStreamlines)}
          className="w-full rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 font-medium"
        >
          {props.showStreamlines ? "Hide Flow Lines" : "Show Flow Lines"}
        </button>

        <button
          onClick={() => props.onAnimatingChange(!props.isAnimating)}
          className="w-full rounded px-3 py-2 bg-gray-100 dark:bg-gray-700 font-medium"
        >
          {props.isAnimating ? "Pause Animation" : "Play Animation"}
        </button>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 pt-4">
        <Info size={14} />
        Values are approximate and depend on the selected simulation mode.
      </div>
    </div>
  );
}

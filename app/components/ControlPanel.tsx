import { Mode, GeometryType } from "../types";
import { Settings, Info } from "lucide-react";

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
  show3D: boolean;
  showStreamlines: boolean;
  isAnimating: boolean;

  onThicknessChange: (v: number) => void;
  onCamberChange: (v: number) => void;
  onVelocityChange: (v: number) => void;
  onAngleChange: (v: number) => void;
  onDensityChange: (v: number) => void;
  onLengthChange: (v: number) => void;
  onAreaChange: (v: number) => void;
  onToggle3D: () => void;
  onToggleStreamlines: () => void;
  onToggleAnimation: () => void;
}

/* =====================================================
   CONTROL CONFIG (MODE-DEPENDENT)
===================================================== */

const controls = {
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

export function ControlPanel({
  mode,
  geometryType,
  thickness,
  camber,
  velocity,
  angleOfAttack,
  density,
  length,
  area,
  show3D,
  showStreamlines,
  isAnimating,
  onThicknessChange,
  onCamberChange,
  onVelocityChange,
  onAngleChange,
  onDensityChange,
  onLengthChange,
  onAreaChange,
  onToggle3D,
  onToggleStreamlines,
  onToggleAnimation,
}: ControlPanelProps) {
  const config = controls[mode];
  const disabled = config.disabled;

  const isDisabled = (key: string) => disabled.includes(key);

  return (
    <div className="w-full h-full p-4 space-y-6 text-sm">
      {/* Header */}
      <div className="flex items-center gap-2 text-gray-800 font-semibold">
        <Settings size={16} />
        Simulation Controls
      </div>

      {/* Angle of Attack */}
      <div>
        <label className="font-medium">
          Angle of Attack (°): {angleOfAttack.toFixed(1)}
        </label>
        <input
          type="range"
          min={config.angle.min}
          max={config.angle.max}
          step={config.angle.step}
          value={angleOfAttack}
          onChange={(e) => onAngleChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-teal-600"
        />
      </div>

      {/* Velocity */}
      <div>
        <label className="font-medium">
          Velocity (m/s): {velocity.toFixed(1)}
        </label>
        <input
          type="range"
          min={config.velocity.min}
          max={config.velocity.max}
          step={config.velocity.step}
          value={velocity}
          onChange={(e) => onVelocityChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-teal-600"
        />
      </div>

      {/* Thickness */}
      <div>
        <label className="font-medium">Thickness: {thickness.toFixed(3)}</label>
        <input
          type="range"
          min={config.thickness.min}
          max={config.thickness.max}
          step={config.thickness.step}
          value={thickness}
          onChange={(e) => onThicknessChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-teal-600"
        />
      </div>

      {/* Camber */}
      <div>
        <label className="font-medium">Camber: {camber.toFixed(3)}</label>
        <input
          type="range"
          min={config.camber.min}
          max={config.camber.max}
          step={config.camber.step}
          value={camber}
          onChange={(e) => onCamberChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-teal-600"
        />
      </div>

      {/* Density */}
      {!isDisabled("density") && (
        <div>
          <label className="font-medium">
            Air Density (kg/m³): {density.toFixed(2)}
          </label>
          <input
            type="number"
            value={density}
            onChange={(e) => onDensityChange(parseFloat(e.target.value))}
            className="w-full rounded px-3 py-1 border border-gray-300"
          />
        </div>
      )}

      {/* Length */}
      {!isDisabled("length") && (
        <div>
          <label className="font-medium">
            Reference Length (m): {length.toFixed(2)}
          </label>
          <input
            type="number"
            value={length}
            onChange={(e) => onLengthChange(parseFloat(e.target.value))}
            className="w-full rounded px-3 py-1 border border-gray-300"
          />
        </div>
      )}

      {/* Area */}
      {!isDisabled("area") && (
        <div>
          <label className="font-medium">
            Reference Area (m²): {area.toFixed(2)}
          </label>
          <input
            type="number"
            value={area}
            onChange={(e) => onAreaChange(parseFloat(e.target.value))}
            className="w-full rounded px-3 py-1 border border-gray-300"
          />
        </div>
      )}

      {/* Toggles */}
      <div className="pt-4 border-t space-y-2">
        <button
          onClick={onToggleStreamlines}
          className="w-full rounded px-3 py-2 bg-gray-100 hover:bg-gray-200 border"
        >
          {showStreamlines ? "Hide Flow Lines" : "Show Flow Lines"}
        </button>

        <button
          onClick={onToggleAnimation}
          className="w-full rounded px-3 py-2 bg-gray-100 hover:bg-gray-200 border"
        >
          {isAnimating ? "Pause Animation" : "Play Animation"}
        </button>
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-gray-500 pt-4">
        <Info size={14} />
        Values are approximate and depend on the selected simulation mode.
      </div>
    </div>
  );
}

export default ControlPanel;

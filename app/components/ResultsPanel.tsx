import { SimulationResults, Mode } from "../types";
import { TrendingUp, Download, AlertCircle, Info } from "lucide-react";

interface ResultsPanelProps {
  results: SimulationResults;
  mode: Mode;
  onExport: () => void;
}

interface MetricCardProps {
  label: string;
  value: number;
  unit: string;
  color: "blue" | "red" | "purple" | "green";
  range: [number, number];
  icon?: React.ReactNode;
}

function MetricCard({
  label,
  value,
  unit,
  color,
  range,
  icon,
}: MetricCardProps) {
  const colorSchemes = {
    blue: "bg-blue-50 border-blue-300 text-blue-700",
    red: "bg-red-50 border-red-300 text-red-700",
    purple: "bg-purple-50 border-purple-300 text-purple-700",
    green: "bg-green-50 border-green-300 text-green-700",
  };

  const iconSchemes = {
    blue: "text-blue-500",
    red: "text-red-500",
    purple: "text-purple-500",
    green: "text-green-500",
  };

  return (
    <div
      className={`rounded-xl p-4 border-2 ${colorSchemes[color]} shadow-sm hover:shadow-md transition`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-bold uppercase tracking-wide opacity-75">
          {label}
        </div>
        {icon && <div className={iconSchemes[color]}>{icon}</div>}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-4xl font-black">{value.toFixed(1)}</div>
        <div className="text-xl font-semibold opacity-75">{unit}</div>
      </div>
      <div className="text-xs mt-2 opacity-70 font-medium">
        Range: {range[0].toFixed(1)} – {range[1].toFixed(1)} {unit}
      </div>
    </div>
  );
}

export default function ResultsPanel({
  results,
  mode,
  onExport,
}: ResultsPanelProps) {
  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "high":
        return "text-green-600 bg-green-50 border-green-300";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-300";
      case "low":
        return "text-red-600 bg-red-50 border-red-300";
      default:
        return "text-gray-600 bg-gray-50 border-gray-300";
    }
  };

  const getStabilityColor = (stability: string) => {
    switch (stability) {
      case "stable":
        return "text-green-600";
      case "marginal":
        return "text-yellow-600";
      case "unstable":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={22} className="text-teal-600" />
          Simulation Results
        </h3>
        {mode === "design" && (
          <button
            onClick={onExport}
            className="bg-teal-600 hover:bg-teal-700 text-white rounded-lg px-4 py-2 flex items-center gap-2 text-sm font-semibold transition shadow-sm hover:shadow-md"
          >
            <Download size={16} />
            Export
          </button>
        )}
      </div>

      {/* Confidence Badge */}
      <div
        className={`mb-4 p-3 rounded-lg border-2 ${getConfidenceColor(
          results.confidence
        )}`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="font-bold text-sm">
              Confidence: {results.confidence.toUpperCase()}
            </span>
          </div>
          <div className="text-xs font-mono">
            Re = {results.reynolds.toExponential(2)}
          </div>
        </div>
        <div className="text-xs mt-2 font-medium opacity-90">
          {results.regime.type} flow regime
        </div>
      </div>

      {/* Primary Metrics - Large Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <MetricCard
          label="Lift Force"
          value={results.lift.nominal}
          unit="N"
          color="blue"
          range={[results.lift.min, results.lift.max]}
          icon={<TrendingUp size={20} />}
        />
        <MetricCard
          label="Drag Force"
          value={results.drag.nominal}
          unit="N"
          color="red"
          range={[results.drag.min, results.drag.max]}
          icon={<TrendingUp size={20} className="rotate-90" />}
        />
      </div>

      {/* Secondary Metrics - Compact Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-gray-600 font-semibold mb-1">
            C<sub>L</sub>
          </div>
          <div className="text-2xl font-black text-blue-700">
            {results.cl.nominal.toFixed(3)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg p-3 border border-red-200">
          <div className="text-xs text-gray-600 font-semibold mb-1">
            C<sub>D</sub>
          </div>
          <div className="text-2xl font-black text-red-700">
            {results.cd.nominal.toFixed(3)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-3 border border-purple-200">
          <div className="text-xs text-gray-600 font-semibold mb-1">L/D</div>
          <div className="text-2xl font-black text-purple-700">
            {results.efficiency.nominal.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Status Row */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold mb-1 flex items-center gap-1">
            <Info size={12} />
            Stability
          </div>
          <div
            className={`text-lg font-bold ${getStabilityColor(
              results.stability
            )}`}
          >
            {results.stability.toUpperCase()}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold mb-1">
            Dynamic Pressure
          </div>
          <div className="text-lg font-bold text-gray-700">
            {results.dynamicPressure.toFixed(1)} Pa
          </div>
        </div>
      </div>

      {/* Mode-Specific Footer */}
      {mode === "design" && (
        <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle
              size={16}
              className="text-amber-700 mt-0.5 flex-shrink-0"
            />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Design Preview:</strong> These are approximate results
              from thin airfoil theory. For accurate CFD analysis with panel
              solver, use the desktop version.
            </p>
          </div>
        </div>
      )}

      {mode === "learning" && (
        <div className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-cyan-50 border-2 border-teal-300 rounded-lg">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-teal-700 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-teal-900 leading-relaxed">
              <strong>Understanding Results:</strong> Lift (upward force) and
              Drag (resistance) depend on angle, speed, and shape. The L/D ratio
              shows efficiency—higher is better!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

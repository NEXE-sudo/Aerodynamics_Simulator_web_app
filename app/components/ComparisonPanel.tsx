import { SimulationResults } from "../types";
import { GitCompare, TrendingUp } from "lucide-react";

interface ComparisonPanelProps {
  currentResults: SimulationResults;
  savedResults: SimulationResults | null;
  onSaveCurrent: () => void;
}

export default function ComparisonPanel({
  currentResults,
  savedResults,
  onSaveCurrent,
}: ComparisonPanelProps) {
  if (!savedResults) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <GitCompare size={20} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Comparison Mode
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            No saved configuration to compare against.
          </p>
          <button
            onClick={onSaveCurrent}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition"
          >
            Save Current as Baseline
          </button>
        </div>
      </div>
    );
  }

  const calculateDifference = (current: number, saved: number) => {
    const diff = current - saved;
    const percentChange = saved !== 0 ? (diff / saved) * 100 : 0;
    return { diff, percentChange };
  };

  const getChangeColor = (percentChange: number) => {
    if (Math.abs(percentChange) < 2) return "text-gray-600";
    return percentChange > 0 ? "text-green-600" : "text-red-600";
  };

  const renderMetricComparison = (
    label: string,
    currentVal: number,
    savedVal: number,
    unit: string = ""
  ) => {
    const { diff, percentChange } = calculateDifference(currentVal, savedVal);
    const isImprovement =
      label.includes("Drag") || label.includes("Efficiency")
        ? diff < 0
        : diff > 0;

    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span
            className={`text-xs font-bold ${
              isImprovement ? "text-green-600" : "text-red-600"
            }`}
          >
            {isImprovement ? "↑" : "↓"} {Math.abs(percentChange).toFixed(1)}%
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500">Current</div>
            <div className="text-lg font-bold text-teal-600">
              {currentVal.toFixed(3)}
              {unit}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Baseline</div>
            <div className="text-lg font-bold text-gray-700">
              {savedVal.toFixed(3)}
              {unit}
            </div>
          </div>
        </div>
        {diff !== 0 && (
          <div
            className={`text-xs mt-2 pt-2 border-t border-gray-300 ${getChangeColor(
              percentChange
            )}`}
          >
            Δ = {diff > 0 ? "+" : ""}
            {diff.toFixed(3)}
            {unit}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <GitCompare size={20} className="text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900">Comparison Mode</h3>
      </div>

      {/* Flow Regime Comparison */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="text-xs font-medium text-gray-700 mb-2">
          Flow Regime
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-600">Current:</span>
            <div className="font-semibold text-blue-700">
              {currentResults.regime.type}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Baseline:</span>
            <div className="font-semibold text-gray-700">
              {savedResults.regime.type}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Comparisons */}
      <div className="space-y-1">
        {renderMetricComparison(
          "Lift Coefficient (CL)",
          currentResults.cl.nominal,
          savedResults.cl.nominal
        )}
        {renderMetricComparison(
          "Drag Coefficient (CD)",
          currentResults.cd.nominal,
          savedResults.cd.nominal
        )}
        {renderMetricComparison(
          "Lift Force",
          currentResults.lift.nominal,
          savedResults.lift.nominal,
          " N"
        )}
        {renderMetricComparison(
          "Drag Force",
          currentResults.drag.nominal,
          savedResults.drag.nominal,
          " N"
        )}
        {renderMetricComparison(
          "L/D Ratio",
          currentResults.efficiency.nominal,
          savedResults.efficiency.nominal
        )}
      </div>

      {/* Reynolds and Stability Comparison */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200">
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1 font-medium">
            Reynolds Number
          </div>
          <div className="text-lg font-bold text-purple-700">
            {currentResults.reynolds.toExponential(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {savedResults.reynolds.toExponential(2)}
          </div>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
          <div className="text-xs text-gray-600 mb-1 font-medium">
            Stability
          </div>
          <div className="text-lg font-bold text-indigo-700">
            {currentResults.stability}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            vs {savedResults.stability}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={onSaveCurrent}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <TrendingUp size={16} />
          Update Baseline
        </button>
      </div>
    </div>
  );
}

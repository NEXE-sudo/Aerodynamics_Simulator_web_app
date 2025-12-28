import type { SimulationResults, Mode } from "../types";
import { TrendingUp, AlertCircle, Info } from "lucide-react";

interface ResultsPanelProps {
  results: SimulationResults;
  mode: Mode;
  onExport: () => void;
}

export default function ResultsPanel({
  results,
  mode,
  onExport,
}: ResultsPanelProps) {
  const getStabilityColor = (stability: string) => {
    switch (stability) {
      case "stable":
        return "bg-green-500/20 text-green-400 border-green-500/40";
      case "marginal":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
      case "unstable":
        return "bg-red-500/20 text-red-400 border-red-500/40";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/40";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
        <TrendingUp size={20} className="text-teal-600 dark:text-teal-400" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Results
        </h3>
      </div>

      {/* Educational Disclaimer */}
      <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700">
        <div className="flex items-start gap-2">
          <Info
            size={14}
            className="text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <p className="text-xs text-amber-900 dark:text-amber-300 leading-snug">
            <strong>Educational Tool:</strong> Simplified for learning.
          </p>
        </div>
      </div>

      {/* Stability Status */}
      <div
        className={`mb-4 p-3 rounded-lg border-2 ${getStabilityColor(
          results.stability
        )}`}
      >
        <div className="flex items-center justify-between">
          <div className="font-bold text-sm">
            {results.stability.toUpperCase()}
          </div>
          {results.stallRisk !== "none" && (
            <div className="text-xs font-semibold">
              {results.stallRisk === "critical" ? "🚨 STALL!" : "⚠️ Warning"}
            </div>
          )}
        </div>
      </div>

      {/* Primary Forces - Compact Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border-2 border-blue-300 dark:border-blue-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
            LIFT
          </div>
          <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
            {Math.abs(results.lift.nominal) < 10
              ? results.lift.nominal.toFixed(1)
              : Math.round(results.lift.nominal)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            N
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 border-2 border-red-300 dark:border-red-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold mb-1">
            DRAG
          </div>
          <div className="text-2xl font-black text-red-700 dark:text-red-400">
            {Math.abs(results.drag.nominal) < 10
              ? results.drag.nominal.toFixed(1)
              : Math.round(results.drag.nominal)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            N
          </div>
        </div>
      </div>

      {/* Coefficients - Compact Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
            C<sub>L</sub>
          </div>
          <div className="text-lg font-black text-blue-700 dark:text-blue-400">
            {results.cl.nominal.toFixed(2)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-lg p-2 border border-red-200 dark:border-red-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
            C<sub>D</sub>
          </div>
          <div className="text-lg font-black text-red-700 dark:text-red-400">
            {results.cd.nominal.toFixed(3)}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-lg p-2 border border-purple-200 dark:border-purple-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold">
            L/D
          </div>
          <div className="text-lg font-black text-purple-700 dark:text-purple-400">
            {Math.min(99, Math.max(0, results.efficiency.nominal)).toFixed(1)}
          </div>
        </div>
      </div>

      {/* What's Happening - Compact */}
      {mode === "learning" && results.explanation && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-1">
            <Info size={12} />
            What&apos;s Happening
          </div>
          <div className="space-y-2 text-xs text-blue-900 dark:text-blue-200 leading-snug">
            <div>
              <span className="font-semibold">Lift:</span>{" "}
              {results.explanation.liftMechanism}
            </div>
            <div className="pt-2 mt-2 border-t border-blue-300 dark:border-blue-600 font-semibold">
              💡 {results.explanation.keyInsight}
            </div>
            {results.explanation.suggestion && (
              <div className="pt-2 text-indigo-700 dark:text-indigo-300 font-medium">
                → {results.explanation.suggestion}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings - Compact */}
      {results.warnings && results.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-lg">
          <div className="text-xs font-bold text-amber-900 dark:text-amber-300 mb-2 flex items-center gap-1">
            <AlertCircle size={12} />
            Notes
          </div>
          <ul className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
            {results.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">•</span>
                <span className="leading-snug">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

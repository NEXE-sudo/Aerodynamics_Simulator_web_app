import React from "react";
import { TrendingUp, Info, AlertCircle } from "lucide-react";
import type { SimulationResults, Mode } from "../types";

interface ResultsPanelProps {
  results: SimulationResults;
  mode: Mode;
  onExport?: () => void;
}

export default function ResultsPanel({
  results,
  mode,
  onExport,
}: ResultsPanelProps) {
  // Extract parameters from results
  const angleOfAttack = results.liftVector
    ? (Math.atan2(results.liftVector.x, results.liftVector.y) * 180) / Math.PI
    : 0;

  // Infer velocity from Reynolds and dynamic pressure
  const velocity = Math.sqrt((2 * results.dynamicPressure) / 1.225); // Assuming air density = 1.225

  // Qualitative flow assessment (no numbers)
  const getFlowBehavior = () => {
    const absAngle = Math.abs(angleOfAttack);

    if (results.stability === "stable" && absAngle < 8) {
      return {
        type: "smooth",
        color: "green",
        description: "Flow follows surface smoothly",
        emoji: "✅",
      };
    } else if (
      results.stability === "marginal" ||
      (absAngle >= 8 && absAngle < 12)
    ) {
      return {
        type: "moderate",
        color: "yellow",
        description: "Flow deflecting noticeably",
        emoji: "⚡",
      };
    } else {
      return {
        type: "disturbed",
        color: "red",
        description: "Flow struggling to follow surface",
        emoji: "⚠️",
      };
    }
  };

  const behavior = getFlowBehavior();

  const speedCategory =
    velocity < 20 ? "Slow" : velocity < 35 ? "Medium" : "Fast";

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-lg border-2 border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
        <TrendingUp size={20} className="text-teal-600 dark:text-teal-400" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          Flow Observations
        </h3>
      </div>

      {/* Educational Disclaimer */}
      <div className="mb-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-300 dark:border-blue-700">
        <div className="flex items-start gap-2">
          <Info
            size={14}
            className="text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0"
          />
          <p className="text-xs text-blue-900 dark:text-blue-300 leading-snug">
            <strong>Learning Tool:</strong> This shows how air moves around
            shapes. It's not engineering software — just visual intuition.
          </p>
        </div>
      </div>

      {/* Flow Behavior Card */}
      <div
        className={`mb-4 p-4 rounded-lg border-2 ${
          behavior.color === "green"
            ? "bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700"
            : behavior.color === "yellow"
            ? "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-400 dark:border-yellow-600"
            : "bg-red-50 dark:bg-red-950/30 border-red-400 dark:border-red-600"
        }`}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">{behavior.emoji}</span>
          <span
            className={`text-xs font-bold uppercase ${
              behavior.color === "green"
                ? "text-green-700 dark:text-green-400"
                : behavior.color === "yellow"
                ? "text-yellow-700 dark:text-yellow-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {behavior.type}
          </span>
        </div>
        <p
          className={`text-sm font-medium ${
            behavior.color === "green"
              ? "text-green-900 dark:text-green-300"
              : behavior.color === "yellow"
              ? "text-yellow-900 dark:text-yellow-300"
              : "text-red-900 dark:text-red-300"
          }`}
        >
          {behavior.description}
        </p>
      </div>

      {/* Current Conditions */}
      <div className="space-y-3">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Flow State
          </div>
          <div className="text-lg font-black text-teal-600 dark:text-teal-400 capitalize">
            {results.stability}
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Wind Speed
          </div>
          <div className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {speedCategory}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {velocity.toFixed(0)} m/s
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Flow Regime
          </div>
          <div className="text-lg font-bold text-purple-600 dark:text-purple-400 capitalize">
            {results.regime.type}
          </div>
        </div>
      </div>

      {/* Learning Mode Insights */}
      {mode === "learning" && results.explanation && (
        <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="text-xs font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-1">
            <Info size={12} />
            What You're Seeing
          </div>
          <div className="space-y-2 text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
            <p>
              <strong>Particle colors:</strong> Blue particles are moving
              slowly, yellow ones are moving fast. Watch how they speed up over
              the curved top!
            </p>
            <p className="pt-2 mt-2 border-t border-blue-300 dark:border-blue-600 font-semibold">
              💡 {results.explanation.keyInsight}
            </p>
            {results.explanation.suggestion && (
              <p className="text-indigo-700 dark:text-indigo-300 font-medium">
                → {results.explanation.suggestion}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warning for extreme conditions */}
      {results.stallRisk === "critical" && (
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-600 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle
              size={14}
              className="text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0"
            />
            <p className="text-xs text-amber-900 dark:text-amber-300 leading-snug">
              <strong>High Angle Notice:</strong> At extreme angles like this,
              real-world flow becomes very complex. This visualization is
              simplified for learning.
            </p>
          </div>
        </div>
      )}

      {/* Additional warnings from physics engine */}
      {results.warnings && results.warnings.length > 0 && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </div>
          <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {results.warnings.map((warning, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-gray-500 font-bold">•</span>
                <span className="leading-snug">{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

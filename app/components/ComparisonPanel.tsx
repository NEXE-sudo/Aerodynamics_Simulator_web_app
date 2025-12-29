import React, { useState } from "react";
import { GitCompare, TrendingUp } from "lucide-react";

interface SavedConfig {
  angle: number;
  velocity: number;
  thickness: number;
  timestamp: number;
}

interface ComparisonPanelProps {
  currentAngle: number;
  currentVelocity: number;
  currentThickness: number;
}

export default function ComparisonPanel({
  currentAngle,
  currentVelocity,
  currentThickness,
}: ComparisonPanelProps) {
  const [savedConfig, setSavedConfig] = useState<SavedConfig | null>(null);

  const handleSave = () => {
    setSavedConfig({
      angle: currentAngle,
      velocity: currentVelocity,
      thickness: currentThickness,
      timestamp: Date.now(),
    });
  };

  if (!savedConfig) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-xl border-2 border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <GitCompare size={20} className="text-teal-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Compare Settings
          </h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Save your current settings as a baseline to compare against.
          </p>
          <button
            onClick={handleSave}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition"
          >
            Save Current as Baseline
          </button>
        </div>
      </div>
    );
  }

  const angleDiff = currentAngle - savedConfig.angle;
  const velocityDiff = currentVelocity - savedConfig.velocity;
  const thicknessDiff = currentThickness - savedConfig.thickness;

  const formatDiff = (diff: number, unit: string = "") => {
    const sign = diff > 0 ? "+" : "";
    return `${sign}${diff.toFixed(1)}${unit}`;
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <GitCompare size={20} className="text-teal-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Settings Comparison
        </h3>
      </div>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">
          💡 Learning Tip
        </div>
        <p className="text-xs text-blue-900 dark:text-blue-200">
          Compare how particles behave with different settings. Try changing one
          thing at a time to see its effect!
        </p>
      </div>

      {/* Angle Comparison */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Angle of Attack
          </span>
          {Math.abs(angleDiff) > 0.5 && (
            <span
              className={`text-xs font-bold ${
                angleDiff > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {angleDiff > 0 ? "↑" : "↓"} {formatDiff(angleDiff, "°")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current
            </div>
            <div className="text-lg font-bold text-teal-600">
              {currentAngle.toFixed(1)}°
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Baseline
            </div>
            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {savedConfig.angle.toFixed(1)}°
            </div>
          </div>
        </div>
      </div>

      {/* Velocity Comparison */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Wind Speed
          </span>
          {Math.abs(velocityDiff) > 2 && (
            <span
              className={`text-xs font-bold ${
                velocityDiff > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {velocityDiff > 0 ? "↑" : "↓"} {formatDiff(velocityDiff, " m/s")}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current
            </div>
            <div className="text-lg font-bold text-teal-600">
              {currentVelocity} m/s
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Baseline
            </div>
            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {savedConfig.velocity} m/s
            </div>
          </div>
        </div>
      </div>

      {/* Thickness Comparison */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Shape Thickness
          </span>
          {Math.abs(thicknessDiff) > 0.01 && (
            <span
              className={`text-xs font-bold ${
                thicknessDiff > 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {thicknessDiff > 0 ? "↑" : "↓"} {formatDiff(thicknessDiff)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Current
            </div>
            <div className="text-lg font-bold text-teal-600">
              {currentThickness.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Baseline
            </div>
            <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
              {savedConfig.thickness.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Message */}
      {(Math.abs(angleDiff) > 0.5 ||
        Math.abs(velocityDiff) > 2 ||
        Math.abs(thicknessDiff) > 0.01) && (
        <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-700 rounded-lg">
          <p className="text-xs text-indigo-900 dark:text-indigo-200">
            <strong>What changed:</strong>{" "}
            {Math.abs(angleDiff) > 0.5
              ? `Angle is ${angleDiff > 0 ? "higher" : "lower"} (${formatDiff(
                  angleDiff,
                  "°"
                )}). `
              : ""}
            {Math.abs(velocityDiff) > 2
              ? `Wind is ${
                  velocityDiff > 0 ? "faster" : "slower"
                } (${formatDiff(velocityDiff, " m/s")}). `
              : ""}
            {Math.abs(thicknessDiff) > 0.01
              ? `Shape is ${thicknessDiff > 0 ? "thicker" : "thinner"}. `
              : ""}
            Watch how these changes affect particle behavior!
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSave}
          className="flex-1 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition text-sm font-medium flex items-center justify-center gap-2"
        >
          <TrendingUp size={16} />
          Update Baseline
        </button>
      </div>
    </div>
  );
}

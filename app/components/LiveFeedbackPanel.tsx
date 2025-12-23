/**
 * Live Feedback Panel - Learning Mode Only
 * =========================================
 * Shows real-time cause → effect explanations
 * Updates when parameters change to explain WHY results changed
 */

import { SimulationResults } from "../types";
import {
  Lightbulb,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from "lucide-react";

interface LiveFeedbackPanelProps {
  results: SimulationResults;
  angleOfAttack: number;
  velocity: number;
  thickness: number;
  previousResults: SimulationResults | null;
  previousAngle: number | null;
  previousVelocity: number | null;
}

interface FeedbackMessage {
  type: "success" | "info" | "warning" | "error";
  icon: "lift" | "drag" | "stall" | "efficiency";
  title: string;
  message: string;
  emoji: string;
}

export default function LiveFeedbackPanel({
  results,
  angleOfAttack,
  velocity,
  thickness,
  previousResults,
  previousAngle,
  previousVelocity,
}: LiveFeedbackPanelPanelProps) {
  const generateFeedback = (): FeedbackMessage | null => {
    if (!previousResults || !previousAngle) return null;

    const liftDelta = results.lift.nominal - previousResults.lift.nominal;
    const dragDelta = results.drag.nominal - previousResults.drag.nominal;
    const angleDelta = angleOfAttack - previousAngle;
    const velocityDelta = previousVelocity ? velocity - previousVelocity : 0;

    // Priority 1: Stall warning
    if (
      results.stability === "unstable" &&
      previousResults.stability !== "unstable"
    ) {
      return {
        type: "error",
        icon: "stall",
        title: "Flow Separation Detected!",
        message: `At ${Math.abs(
          angleOfAttack
        )}°, the flow has separated from the surface. 
                  Lift drops dramatically and drag increases. This is called stall. 
                  Reduce angle of attack to recover smooth flow.`,
        emoji: "⚠️",
      };
    }

    // Priority 2: Approaching stall
    if (results.stability === "marginal" && Math.abs(angleDelta) > 0) {
      return {
        type: "warning",
        icon: "stall",
        title: "Approaching Stall Zone",
        message: `At ${Math.abs(
          angleOfAttack
        )}°, you're getting close to stall. 
                  The flow is starting to separate. Notice how lift gains are smaller 
                  and drag is increasing faster.`,
        emoji: "⚡",
      };
    }

    // Priority 3: Significant lift change
    if (Math.abs(liftDelta) > 5 && Math.abs(angleDelta) > 0.5) {
      const direction = liftDelta > 0 ? "increased" : "decreased";
      const reason =
        angleDelta > 0
          ? "increasing the angle means air flows faster over the curved top surface"
          : "decreasing the angle reduces the pressure difference between top and bottom";

      return {
        type: liftDelta > 0 ? "success" : "info",
        icon: "lift",
        title: `Lift ${direction} by ${Math.abs(liftDelta).toFixed(1)} N`,
        message: `Because you ${
          angleDelta > 0 ? "increased" : "decreased"
        } the angle of attack, 
                  ${reason}. This pressure difference creates lift. 
                  Current lift: ${results.lift.nominal.toFixed(1)} N`,
        emoji: liftDelta > 0 ? "⬆️" : "⬇️",
      };
    }

    // Priority 4: Velocity change effects
    if (Math.abs(velocityDelta) > 2) {
      const velocityChange =
        velocity > (previousVelocity || 0) ? "increased" : "decreased";
      return {
        type: "info",
        icon: "lift",
        title: `Speed ${velocityChange} to ${velocity} m/s`,
        message: `Lift and drag both depend on velocity squared (V²). 
                  ${
                    velocityChange === "increased" ? "Higher" : "Lower"
                  } speed means 
                  ${
                    velocityChange === "increased" ? "more" : "less"
                  } dynamic pressure, 
                  so forces change dramatically. New lift: ${results.lift.nominal.toFixed(
                    1
                  )} N`,
        emoji: "💨",
      };
    }

    // Priority 5: Drag change
    if (Math.abs(dragDelta) > 2) {
      return {
        type: "warning",
        icon: "drag",
        title: `Drag ${dragDelta > 0 ? "increased" : "decreased"} by ${Math.abs(
          dragDelta
        ).toFixed(1)} N`,
        message: `Higher angles create more pressure resistance (form drag). 
                  Also, creating lift requires energy, which shows up as induced drag. 
                  Current drag: ${results.drag.nominal.toFixed(1)} N`,
        emoji: "⬅️",
      };
    }

    // Priority 6: Efficiency change
    const efficiencyDelta =
      results.efficiency.nominal - previousResults.efficiency.nominal;
    if (Math.abs(efficiencyDelta) > 1) {
      return {
        type: efficiencyDelta > 0 ? "success" : "info",
        icon: "efficiency",
        title: `Efficiency (L/D) ${
          efficiencyDelta > 0 ? "improved" : "decreased"
        }`,
        message: `L/D ratio shows how much lift you get per unit of drag. 
                  ${
                    efficiencyDelta > 0
                      ? "You found a better operating point!"
                      : "Trade-offs are getting worse."
                  } 
                  Current L/D: ${results.efficiency.nominal.toFixed(1)}`,
        emoji: efficiencyDelta > 0 ? "✅" : "📉",
      };
    }

    return null;
  };

  const feedback = generateFeedback();

  // Always show something in learning mode
  if (!feedback) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-teal-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="text-3xl">💡</div>
          <div>
            <h4 className="font-bold text-blue-900 text-sm mb-2">
              Ready to Learn!
            </h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Adjust the angle of attack slider to see how lift changes. Watch
              the particles flow over the wing and notice how they speed up on
              top!
            </p>
          </div>
        </div>
      </div>
    );
  }

  const colorSchemes = {
    success: {
      bg: "from-green-50 to-emerald-50",
      border: "border-green-300",
      text: "text-green-900",
      titleText: "text-green-950",
    },
    info: {
      bg: "from-blue-50 to-cyan-50",
      border: "border-blue-300",
      text: "text-blue-900",
      titleText: "text-blue-950",
    },
    warning: {
      bg: "from-amber-50 to-yellow-50",
      border: "border-amber-400",
      text: "text-amber-900",
      titleText: "text-amber-950",
    },
    error: {
      bg: "from-red-50 to-orange-50",
      border: "border-red-400",
      text: "text-red-900",
      titleText: "text-red-950",
    },
  };

  const colors = colorSchemes[feedback.type];

  return (
    <div
      className={`bg-gradient-to-br ${colors.bg} border-2 ${colors.border} rounded-xl p-4 shadow-md animate-in fade-in slide-in-from-top-2 duration-300`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl flex-shrink-0">{feedback.emoji}</div>
        <div className="flex-1 min-w-0">
          <h4
            className={`font-bold text-sm mb-2 ${colors.titleText} flex items-center gap-2`}
          >
            {feedback.icon === "lift" && <TrendingUp size={16} />}
            {feedback.icon === "drag" && <TrendingDown size={16} />}
            {feedback.icon === "stall" && <AlertTriangle size={16} />}
            {feedback.icon === "efficiency" && <Lightbulb size={16} />}
            {feedback.title}
          </h4>
          <p className={`text-xs ${colors.text} leading-relaxed`}>
            {feedback.message}
          </p>
        </div>
      </div>

      {/* Mini visual indicator */}
      <div className="mt-3 pt-3 border-t border-gray-300/50">
        <div className="flex items-center justify-between text-xs">
          <span className={`font-medium ${colors.text}`}>
            Current: α = {angleOfAttack.toFixed(1)}° • V = {velocity} m/s
          </span>
          <span className={`font-mono text-xs ${colors.text} opacity-75`}>
            Re = {results.reynolds.toExponential(1)}
          </span>
        </div>
      </div>
    </div>
  );
}

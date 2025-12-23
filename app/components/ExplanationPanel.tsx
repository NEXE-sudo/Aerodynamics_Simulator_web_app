import { SimulationResults } from "../types";
import { Info, BookOpen } from "lucide-react";

interface ExplanationPanelProps {
  results: SimulationResults;
  angleOfAttack: number;
  velocity: number;
  thickness: number;
}

export default function ExplanationPanel({
  results,
  angleOfAttack,
  velocity,
  thickness,
}: ExplanationPanelProps) {
  const getAngleExplanation = () => {
    if (angleOfAttack > 0) {
      return `At ${angleOfAttack}° angle of attack, the wing is tilted upward. Air flows faster over the curved top surface, creating lower pressure above than below. This pressure difference generates ${
        results.cl.nominal > 0 ? "upward" : "downward"
      } lift force.`;
    } else if (angleOfAttack < 0) {
      return `At ${angleOfAttack}° angle (negative), the wing is tilted downward. This creates higher pressure on top and lower pressure below, resulting in negative lift (downforce).`;
    } else {
      return "At 0° angle of attack, lift depends mainly on the wing camber (asymmetric shape). Cambered wings still generate lift at zero angle.";
    }
  };

  const getDragExplanation = () => {
    if (results.cd.nominal > 0.05) {
      return "Drag is relatively high. This could be due to flow separation, high angle of attack, or thick airfoil profile. The flow may be breaking away from the surface, creating turbulent wake.";
    } else if (results.cd.nominal > 0.02) {
      return "Drag is moderate. The flow is mostly attached but there's some resistance from skin friction and pressure differences.";
    } else {
      return "Drag is low, indicating smooth, efficient flow over the surface. The airfoil is operating in its optimal range with minimal separation.";
    }
  };

  const getEfficiencyExplanation = () => {
    const efficiency = results.efficiency.nominal;
    if (efficiency > 20) {
      return "Excellent efficiency! The lift-to-drag ratio is very high, meaning you get lots of lift for minimal drag. This is ideal for gliders and efficient flight.";
    } else if (efficiency > 10) {
      return "Good efficiency. The wing is producing reasonable lift relative to its drag. This is typical for many aircraft designs.";
    } else if (efficiency > 5) {
      return "Moderate efficiency. There's significant drag relative to the lift produced. Consider reducing angle or improving airfoil shape.";
    } else {
      return "Low efficiency. The drag is very high compared to lift. This often happens at high angles near stall, or with very thick/blunt shapes.";
    }
  };

  const getStallWarning = () => {
    if (Math.abs(angleOfAttack) > 12) {
      return {
        show: true,
        message: `⚠️ Warning: At ${Math.abs(
          angleOfAttack
        )}°, you're approaching or past the stall angle. Flow is likely separating from the surface, causing a dramatic loss in lift and increase in drag.`,
        severity: "high",
      };
    } else if (Math.abs(angleOfAttack) > 8) {
      return {
        show: true,
        message: `At ${Math.abs(
          angleOfAttack
        )}°, you're entering the high angle of attack regime. Monitor for flow separation.`,
        severity: "medium",
      };
    }
    return { show: false, message: "", severity: "low" };
  };

  const stallWarning = getStallWarning();

  return (
    <div className="bg-white border-2 border-blue-300 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <BookOpen size={20} />
        Understanding What&apos;s Happening
      </h3>

      {/* Main Explanation */}
      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-1">
            <Info size={16} />
            Angle of Attack Effect
          </h4>
          <p className="text-sm text-gray-700">{getAngleExplanation()}</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">
            Drag Behavior
          </h4>
          <p className="text-sm text-gray-700">{getDragExplanation()}</p>
        </div>

        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <h4 className="text-sm font-semibold text-purple-900 mb-1">
            Overall Efficiency
          </h4>
          <p className="text-sm text-gray-700">{getEfficiencyExplanation()}</p>
        </div>

        {/* Stall Warning */}
        {stallWarning.show && (
          <div
            className={`rounded-lg p-3 border ${
              stallWarning.severity === "high"
                ? "bg-red-50 border-red-300"
                : "bg-amber-50 border-amber-300"
            }`}
          >
            <p
              className={`text-sm font-medium ${
                stallWarning.severity === "high"
                  ? "text-red-800"
                  : "text-amber-800"
              }`}
            >
              {stallWarning.message}
            </p>
          </div>
        )}

        {/* Key Concepts */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Key Concepts
          </h4>
          <ul className="space-y-1 text-xs text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>
                  Reynolds Number ({results.reynolds.toExponential(2)}):
                </strong>{" "}
                Indicates flow regime. Higher = more turbulent, affects
                prediction accuracy.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>Confidence Ranges:</strong> Account for model
                uncertainty. Use wider ranges for safety margins in real
                designs.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-teal-600 font-bold">•</span>
              <span>
                <strong>Flow Regime ({results.regime.type}):</strong> Describes
                how the air moves around the wing—affects performance
                predictions.
              </span>
            </li>
          </ul>
        </div>

        {/* Interactive Tips */}
        <div className="mt-3 p-2 bg-teal-50 rounded border border-teal-200">
          <p className="text-xs text-teal-900">
            <strong>💡 Try this:</strong> Gradually increase the angle of attack
            and watch how lift increases—until stall! Notice how drag also
            rises. Find the sweet spot where L/D ratio is highest.
          </p>
        </div>
      </div>
    </div>
  );
}

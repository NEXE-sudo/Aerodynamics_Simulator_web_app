import { Mode } from "../types";
import { GraduationCap, Compass, GitCompare } from "lucide-react";

interface ModeSelectorProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({
  mode,
  onModeChange,
}: ModeSelectorProps) {
  const modes: {
    id: Mode;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "learning",
      label: "Learning",
      description: "Safe ranges • Live explanations",
      icon: <GraduationCap size={20} />,
    },
    {
      id: "design",
      label: "Design Preview",
      description: "Explore geometry • Basic analysis",
      icon: <Compass size={20} />,
    },
    {
      id: "comparison",
      label: "Comparison",
      description: "Compare designs • See deltas",
      icon: <GitCompare size={20} />,
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex gap-3 overflow-x-auto pb-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`group relative flex-shrink-0 px-6 py-4 rounded-xl font-semibold transition-all duration-300 border-2 hover:scale-105 ${
              mode === m.id
                ? "bg-gradient-to-br from-teal-500 to-cyan-500 border-teal-600 text-white shadow-lg shadow-teal-500/30 animate-gradient"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-md"
            }`}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={mode === m.id ? "text-white" : "text-teal-600"}>
                {m.icon}
              </div>
              <span className="text-base">{m.label}</span>
            </div>
            <p
              className={`text-xs ${
                mode === m.id
                  ? "text-teal-50"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {m.description}
            </p>
            {mode === m.id && (
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-teal-500 rounded-full shadow-md" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

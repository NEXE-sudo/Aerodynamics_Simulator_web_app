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
    gradient: string;
  }[] = [
    {
      id: "learning",
      label: "Learning",
      description: "Safe ranges • Live explanations",
      icon: <GraduationCap size={22} />,
      gradient: "from-teal-500 to-cyan-500",
    },
    {
      id: "design",
      label: "Design Preview",
      description: "Explore geometry • Basic analysis",
      icon: <Compass size={22} />,
      gradient: "from-blue-500 to-indigo-500",
    },
    {
      id: "comparison",
      label: "Comparison",
      description: "Compare designs • See deltas",
      icon: <GitCompare size={22} />,
      gradient: "from-purple-500 to-pink-500",
    },
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap justify-center gap-4">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`group relative flex-shrink-0 px-8 py-5 rounded-2xl font-semibold transition-all duration-300 border-2 ${
              mode === m.id
                ? `bg-gradient-to-br ${m.gradient} border-transparent text-white shadow-2xl scale-105`
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-xl hover:scale-105"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={
                  mode === m.id
                    ? "text-white"
                    : "text-teal-600 dark:text-teal-400"
                }
              >
                {m.icon}
              </div>
              <span className="text-lg">{m.label}</span>
            </div>
            <p
              className={`text-sm ${
                mode === m.id
                  ? "text-white/90"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {m.description}
            </p>
            {mode === m.id && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-3 h-3 bg-white dark:bg-gray-800 rotate-45 border-b-2 border-r-2 border-transparent"></div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

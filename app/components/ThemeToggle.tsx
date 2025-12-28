"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../providers/ThemeProvider";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full glass-effect hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl group"
      aria-label="Toggle theme"
    >
      {/* Render both icons so server and client markup match. CSS (Tailwind) will show the correct one. */}
      <Sun
        className="hidden dark:inline w-5 h-5 text-amber-500 group-hover:rotate-90 transition-transform duration-300"
        aria-hidden="true"
      />
      <Moon
        className="inline dark:hidden w-5 h-5 text-slate-700 group-hover:-rotate-12 transition-transform duration-300"
        aria-hidden="true"
      />
    </button>
  );
}

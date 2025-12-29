import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);

    // Check localStorage first, then system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDark(shouldBeDark);

    // Apply immediately
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);

    // Update DOM
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Save to localStorage
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <button
        className="fixed top-4 right-4 z-50 p-3 rounded-full glass-effect hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl group"
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl group border border-gray-200 dark:border-gray-700"
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun
          className="w-5 h-5 text-amber-500 group-hover:rotate-90 transition-transform duration-300"
          aria-hidden="true"
        />
      ) : (
        <Moon
          className="w-5 h-5 text-slate-700 group-hover:-rotate-12 transition-transform duration-300"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// components/ui/SliderInput.tsx
import React from "react";

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export default function SliderInput({
  label,
  value,
  min,
  max,
  step,
  unit = "",
  onChange,
  disabled = false,
}: SliderInputProps) {
  if (disabled) return null;

  return (
    <div>
      <label className="font-medium text-gray-900 dark:text-gray-100">
        {label}: {value.toFixed(step < 0.1 ? 3 : 1)} {unit}
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer accent-teal-500 hover:accent-teal-600 transition"
      />
    </div>
  );
}

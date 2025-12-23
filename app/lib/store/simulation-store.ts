/**
 * Zustand store - separates state from UI
 * Makes Tauri transition easier
 */

import { create } from "zustand";
import { SimulationResults } from "../../types";
import { PhysicsEngine } from "../physics-engine";

interface SimulationState {
  // Parameters
  velocity: number;
  angleOfAttack: number;
  thickness: number;
  camber: number;
  density: number;

  // Results
  results: SimulationResults | null;

  // UI state
  isAnimating: boolean;
  showStreamlines: boolean;

  // Actions
  setVelocity: (v: number) => void;
  setAngleOfAttack: (a: number) => void;
  setThickness: (t: number) => void;
  setCamber: (c: number) => void;
  runSimulation: () => void;
  toggleAnimation: () => void;
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  velocity: 20,
  angleOfAttack: 5,
  thickness: 0.12,
  camber: 0.02,
  density: 1.225,

  results: null,
  isAnimating: false,
  showStreamlines: true,

  setVelocity: (v) => set({ velocity: v }),
  setAngleOfAttack: (a) => set({ angleOfAttack: a }),
  setThickness: (t) => set({ thickness: t }),
  setCamber: (c) => set({ camber: c }),

  runSimulation: () => {
    const state = get();
    const results = PhysicsEngine.simulate({
      velocity: state.velocity,
      angleOfAttack: state.angleOfAttack,
      thickness: state.thickness,
      camber: state.camber,
      density: state.density,
      area: 0.5,
      length: 1.0,
      geometry: "symmetric",
    });
    set({ results });
  },

  toggleAnimation: () => set((state) => ({ isAnimating: !state.isAnimating })),
}));

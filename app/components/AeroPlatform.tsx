"use client";

import { useState, useEffect } from "react";
import { simulateLegacy } from "../lib/physics/engine";
import { GeometryGenerator } from "../lib/visualization/geometry";
import ThreeJSViewer from "../components/ThreeJSViewer";
import { Mode, GeometryType, SimulationResults, Point } from "../types";
import { UploadedModel } from "../types";
import ModelUploader from "../components/ModelUploader";
import ThemeToggle from "../components/ThemeToggle";

import Header from "../components/Header";
import ModeSelector from "../components/ModeSelector";
import ControlPanel from "../components/ControlPanel";
import ResultsPanel from "../components/ResultsPanel";
import LiveFeedbackPanel from "../components/LiveFeedbackPanel";
import ComparisonPanel from "../components/ComparisonPanel";

export default function AeroPlatform() {
  const [mode, setMode] = useState<Mode>("learning");
  const [geometryType, setGeometryType] = useState<GeometryType>("symmetric");

  // Simulation parameters
  const [velocity, setVelocity] = useState(20);
  const [density, setDensity] = useState(1.225);
  const [area, setArea] = useState(0.5);
  const [length, setLength] = useState(1.0);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [thickness, setThickness] = useState(0.12);
  const [camber, setCamber] = useState(0.02);

  const [previousResults, setPreviousResults] =
    useState<SimulationResults | null>(null);
  const [previousAngle, setPreviousAngle] = useState<number | null>(null);
  const [previousVelocity, setPreviousVelocity] = useState<number | null>(null);

  const [uploadedModel, setUploadedModel] = useState<UploadedModel | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(true);

  const [savedResults, setSavedResults] = useState<SimulationResults | null>(
    null
  );
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [geometry, setGeometry] = useState<Point[]>([]);

  const handleModelClear = () => {
    setUploadedModel(null);
    const geom = GeometryGenerator.generateAirfoil(geometryType, {
      thickness,
      camber,
    });
    setGeometry(geom);
  };

  const runSimulation = () => {
    const params = {
      velocity,
      density,
      area,
      length,
      angleOfAttack,
      thickness,
      camber,
      geometry: geometryType,
    };

    if (results) {
      setPreviousResults(results);
      setPreviousAngle(angleOfAttack);
      setPreviousVelocity(velocity);
    }

    const simResults = simulateLegacy(params);
    setResults(simResults);

    const geom = GeometryGenerator.generateAirfoil(geometryType, {
      thickness,
      camber,
    });
    setGeometry(geom);
  };

  useEffect(() => {
    runSimulation();
  }, [
    velocity,
    density,
    angleOfAttack,
    thickness,
    camber,
    geometryType,
    area,
    length,
  ]);

  const exportReport = () => {
    console.log("Export functionality to be implemented");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <ThemeToggle />

        {/* Header Section */}
        <div className="mb-6 text-center">
          <Header />
        </div>

        {/* Mode Selector */}
        <div className="mb-6">
          <ModeSelector mode={mode} onModeChange={setMode} />
        </div>

        {/* NEW LAYOUT: Three columns for better visibility */}
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr_380px] gap-4">
          {/* LEFT COLUMN - Controls */}
          <aside className="space-y-4">
            <ControlPanel
              mode={mode}
              geometryType={geometryType}
              thickness={thickness}
              camber={camber}
              velocity={velocity}
              angleOfAttack={angleOfAttack}
              density={density}
              length={length}
              area={area}
              isAnimating={isAnimating}
              onGeometryTypeChange={setGeometryType}
              onThicknessChange={setThickness}
              onCamberChange={setCamber}
              onVelocityChange={setVelocity}
              onAngleChange={setAngleOfAttack}
              onDensityChange={setDensity}
              onLengthChange={setLength}
              onAreaChange={setArea}
              onAnimatingChange={setIsAnimating}
            />

            <ModelUploader
              onModelUpload={setUploadedModel}
              currentModel={uploadedModel}
              onClear={handleModelClear}
            />
          </aside>

          {/* CENTER - 3D Viewer */}
          <main className="flex flex-col gap-4">
            <div className="w-full h-[600px] bg-slate-950 rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-800">
              <ThreeJSViewer
                geometry={geometry}
                uploadedModel={uploadedModel}
                velocity={velocity}
                angleOfAttack={angleOfAttack}
                isAnimating={isAnimating}
              />
            </div>

            {/* Learning Feedback Below Viewer */}
            {mode === "learning" && results && (
              <LiveFeedbackPanel
                results={results}
                angleOfAttack={angleOfAttack}
                velocity={velocity}
                thickness={thickness}
                previousResults={previousResults}
                previousAngle={previousAngle}
                previousVelocity={previousVelocity}
              />
            )}
          </main>

          {/* RIGHT COLUMN - Results (Always Visible!) */}
          <aside className="space-y-4">
            {results && (
              <>
                <ResultsPanel
                  results={results}
                  mode={mode}
                  onExport={exportReport}
                />

                {mode === "comparison" && (
                  <ComparisonPanel
                    currentResults={results}
                    savedResults={savedResults}
                    onSaveCurrent={() => setSavedResults(results)}
                  />
                )}
              </>
            )}
          </aside>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <strong>Educational Aerodynamics Platform</strong> • Free Web
              Version
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Simplified models for learning • Not for professional use
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

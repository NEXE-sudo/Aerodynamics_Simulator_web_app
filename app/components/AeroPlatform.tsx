"use client";

import { useState, useEffect, useRef } from "react";
import { simulateLegacy } from "../lib/physics/engine";
import { GeometryGenerator } from "../lib/visualization/geometry";
import { ParticleSystem } from "../lib/visualization/particles";
import { FlowField } from "../lib/visualization/flow-field";
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
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [view2DProjection, setView2DProjection] = useState<"xy" | "xz" | "yz">(
    "xy"
  );

  const [uploadedModel, setUploadedModel] = useState<UploadedModel | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(true);
  const [streamlines, setStreamlines] = useState<Point[][]>([]);
  const [pressureField, setPressureField] = useState<number[]>([]);
  const [showStreamlines, setShowStreamlines] = useState(true);

  const [savedResults, setSavedResults] = useState<SimulationResults | null>(
    null
  );
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [geometry, setGeometry] = useState<Point[]>([]);

  const particleSystemRef = useRef<ParticleSystem | null>(null);

  // Removed the 'cameraRef' useEffect block here - it caused the crash!

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

    const streamlinesData = FlowField.generateStreamlines(
      geom,
      velocity,
      angleOfAttack
    );
    setStreamlines(streamlinesData);

    const pressureData = FlowField.calculatePressureField(
      geom,
      velocity,
      density
    );
    setPressureField(pressureData);

    if (!particleSystemRef.current && geom.length > 0) {
      particleSystemRef.current = new ParticleSystem(geom, 250);
    }
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
    // ... (Keep existing export logic)
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto p-6">
        <ThemeToggle />
        <Header />
        <ModeSelector mode={mode} onModeChange={setMode} />

        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
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
              showStreamlines={showStreamlines}
              isAnimating={isAnimating}
              onGeometryTypeChange={setGeometryType}
              onThicknessChange={setThickness}
              onCamberChange={setCamber}
              onVelocityChange={setVelocity}
              onAngleChange={setAngleOfAttack}
              onDensityChange={setDensity}
              onLengthChange={setLength}
              onAreaChange={setArea}
              onShowStreamlinesChange={setShowStreamlines}
              onAnimatingChange={setIsAnimating}
            />
            <ModelUploader
              onModelUpload={setUploadedModel}
              currentModel={uploadedModel}
            />
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
          </aside>

          <main className="space-y-6">
            {/* The container for the new professional 3D scene */}
            <div className="bg-slate-950 rounded-xl shadow-2xl overflow-hidden border-2 border-slate-800 h-[650px] relative">
              <ThreeJSViewer
                geometry={geometry}
                uploadedModel={uploadedModel}
                velocity={velocity}
                angleOfAttack={angleOfAttack}
                isAnimating={isAnimating}
              />
            </div>

            {/* Simulation Results remain below the viewer */}
            {results && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              </div>
            )}
          </main>
        </div>
        <footer className="mt-10 text-center border-t-2 border-gray-200 dark:border-gray-700 pt-6">
          {/* ... footer content ... */}
        </footer>
      </div>
    </div>
  );
}

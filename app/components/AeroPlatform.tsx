"use client";

import { useState, useEffect, useRef } from "react";
import { PhysicsEngine } from "../lib/physics-engine";
import { GeometryGenerator } from "../lib/visualization/geometry";
import { ParticleSystem } from "../lib/visualization/particles";
import { FlowField } from "../lib/visualization/flow-field";
import ThreeJSViewer from "../components/ThreeJSViewer";
import { Mode, GeometryType, SimulationResults, Point } from "../types";

import Header from "../components/Header";
import ModeSelector from "../components/ModeSelector";
import ControlPanel from "../components/ControlPanel";
import VisualizationCanvas from "../components/VisualizationCanvas";
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

  // Previous values for live feedback
  const [previousResults, setPreviousResults] =
    useState<SimulationResults | null>(null);
  const [previousAngle, setPreviousAngle] = useState<number | null>(null);
  const [previousVelocity, setPreviousVelocity] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [view2DProjection, setView2DProjection] = useState<"xy" | "xz" | "yz">(
    "xy"
  );

  // Visualization state
  const [uploadedModel, setUploadedModel] = useState<UploadedModel | null>(
    null
  );
  const [isAnimating, setIsAnimating] = useState(true); // Start animating by default
  const [streamlines, setStreamlines] = useState<Point[][]>([]);
  const [pressureField, setPressureField] = useState<number[]>([]);
  const [showStreamlines, setShowStreamlines] = useState(true);

  // Comparison mode
  const [savedResults, setSavedResults] = useState<SimulationResults | null>(
    null
  );

  // Results
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [geometry, setGeometry] = useState<Point[]>([]);

  // Particle system
  const particleSystemRef = useRef<ParticleSystem | null>(null);

  // Run simulation
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

    // Save previous results for comparison
    if (results) {
      setPreviousResults(results);
      setPreviousAngle(angleOfAttack);
      setPreviousVelocity(velocity);
    }

    const simResults = PhysicsEngine.simulate(params);
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

    // Initialize or update particle system
    if (!particleSystemRef.current && geom.length > 0) {
      particleSystemRef.current = new ParticleSystem(geom, 250);
    }
  };

  // Run simulation on parameter changes
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
    if (!results) return;

    const report = `
AERODYNAMICS SIMULATION REPORT
==============================

Geometry: ${geometryType}
Date: ${new Date().toLocaleDateString()}

PARAMETERS
----------
Velocity: ${velocity} m/s
Density: ${density} kg/m³
Angle of Attack: ${angleOfAttack}°
Reference Area: ${area} m²
Chord Length: ${length} m

RESULTS (Approximate Analytical Model)
---------------------------------------
Reynolds Number: ${results.reynolds.toExponential(2)}
Flow Regime: ${results.regime.type}
Confidence: ${results.confidence}

Lift Coefficient (CL): ${results.cl.nominal.toFixed(
      3
    )} [${results.cl.min.toFixed(3)} - ${results.cl.max.toFixed(3)}]
Drag Coefficient (CD): ${results.cd.nominal.toFixed(
      3
    )} [${results.cd.min.toFixed(3)} - ${results.cd.max.toFixed(3)}]

Lift Force: ${results.lift.nominal.toFixed(2)} N [${results.lift.min.toFixed(
      2
    )} - ${results.lift.max.toFixed(2)} N]
Drag Force: ${results.drag.nominal.toFixed(2)} N [${results.drag.min.toFixed(
      2
    )} - ${results.drag.max.toFixed(2)} N]

L/D Ratio: ${results.efficiency.nominal.toFixed(2)}
Stability: ${results.stability}

DISCLAIMER
----------
Results based on thin airfoil theory and empirical corrections.
This is an approximate analytical model for educational purposes.
Ranges indicate uncertainty based on flow regime complexity.
NOT suitable for engineering validation or critical design decisions.
    `.trim();

    const blob = new Blob([report], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aero_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-100 text-gray-900">
      <div className="max-w-[1600px] mx-auto p-6">
        <Header />
        <ModeSelector mode={mode} onModeChange={setMode} />

        {/* Main Layout: Sidebar + Content */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          {/* LEFT SIDEBAR: Controls */}
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

            {/* Live Feedback - Learning Mode Only */}
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

          {/* RIGHT CONTENT: Visualization + Results */}
          <main className="space-y-6">
            {/* Primary Visualization Canvas */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden border-2 border-gray-200 h-[600px] relative">
              {/* View Mode Toggle - Fixed positioning */}
              <div className="absolute top-4 right-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 flex gap-2">
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    viewMode === "2d"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  2D View
                </button>
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    viewMode === "3d"
                      ? "bg-blue-600 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  3D View
                </button>
              </div>

              {viewMode === "2d" ? (
                <>
                  {/* 2D Projection Controls - Only show if model uploaded */}
                  {uploadedModel && (
                    <div className="absolute top-4 left-4 z-50 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2">
                      <div className="text-xs font-semibold text-gray-700 mb-2">Projection Plane</div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setView2DProjection('xy')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            view2DProjection === 'xy'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Top view (XY plane)"
                        >
                          Top (XY)
                        </button>
                        <button
                          onClick={() => setView2DProjection('xz')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            view2DProjection === 'xz'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Front view (XZ plane)"
                        >
                          Front (XZ)
                        </button>
                        <button
                          onClick={() => setView2DProjection('yz')}
                          className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                            view2DProjection === 'yz'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                          title="Side view (YZ plane)"
                        >
                          Side (YZ)
                        </button>
                      </div>
                    </div>
                  )}
                  <VisualizationCanvas
                  geometry={geometry}
                  streamlines={streamlines}
                  pressureField={pressureField}
                  particleSystem={particleSystemRef.current}
                  isAnimating={isAnimating}
                  showStreamlines={showStreamlines}
                  angleOfAttack={angleOfAttack}
                  velocity={velocity}
                />
              ) : (
                <ThreeJSViewer
                  geometry={geometry}
                  streamlines={streamlines}
                  pressureField={pressureField}
                  isAnimating={isAnimating}
                  uploadedModel={uploadedModel}
                />
              )}
            </div>

            {/* Results Section */}
            {results && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Results Panel */}
                <ResultsPanel
                  results={results}
                  mode={mode}
                  onExport={exportReport}
                />

                {/* Comparison Panel - Comparison Mode Only */}
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

        {/* Footer with Disclaimers */}
        <footer className="mt-10 text-center border-t-2 border-gray-200 pt-6">
          <p className="text-sm font-medium text-gray-700">
            Interactive Aerodynamics Platform •{" "}
            <span className="text-amber-600 font-bold">
              Approximate Analytical Model
            </span>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Thin airfoil theory + empirical drag corrections • Educational
            visualization only
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Not for engineering validation or critical design decisions
          </p>
        </footer>
      </div>
    </div>
  );
}

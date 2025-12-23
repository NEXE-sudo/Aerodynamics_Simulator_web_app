import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Play, Pause, RotateCcw, Info, Settings, TrendingUp, AlertCircle } from 'lucide-react';
import * as THREE from 'three';

// ============================================================================
// PHYSICS ENGINE MODULE
// ============================================================================
const PhysicsEngine = {
  // Calculate Reynolds number
  calculateReynolds(velocity, length, density = 1.225, viscosity = 1.81e-5) {
    return (density * velocity * length) / viscosity;
  },

  // Classify flow regime
  classifyFlowRegime(reynolds) {
    if (reynolds < 5e5) return { type: 'laminar', confidence: 'high' };
    if (reynolds < 1e6) return { type: 'transitional', confidence: 'medium' };
    if (reynolds < 3e6) return { type: 'turbulent', confidence: 'medium' };
    return { type: 'separation-likely', confidence: 'low' };
  },

  // Calculate lift coefficient using thin airfoil theory with corrections
  calculateLiftCoefficient(angleOfAttack, camber, thickness, reynolds) {
    const alpha = angleOfAttack * Math.PI / 180;
    
    // Base lift slope (2π for thin airfoil theory)
    const liftSlope = 2 * Math.PI;
    
    // Camber contribution
    const camberLift = camber * Math.PI;
    
    // Thickness correction
    const thicknessCorrection = 1 - 0.3 * thickness;
    
    // Reynolds correction
    const reynoldsCorrection = Math.min(1, Math.log10(reynolds) / 6);
    
    // Stall model (simplified)
    const stallAngle = 15 - thickness * 10;
    const stallFactor = Math.abs(angleOfAttack) > stallAngle 
      ? Math.cos(alpha * 2) * 0.5 
      : 1;
    
    const cl = (liftSlope * alpha + camberLift) * thicknessCorrection * reynoldsCorrection * stallFactor;
    
    return cl;
  },

  // Calculate drag coefficient
  calculateDragCoefficient(angleOfAttack, thickness, camber, reynolds) {
    const alpha = Math.abs(angleOfAttack * Math.PI / 180);
    
    // Parasitic drag
    const cd0 = 0.006 + thickness * 0.02;
    
    // Induced drag
    const cl = this.calculateLiftCoefficient(angleOfAttack, camber, thickness, reynolds);
    const aspectRatio = 6; // Assumed
    const cdi = (cl * cl) / (Math.PI * aspectRatio * 0.85);
    
    // Pressure drag (increases with angle)
    const cdp = Math.sin(alpha) * Math.sin(alpha) * 0.1;
    
    // Reynolds-based friction correction
    const cf = 0.074 / Math.pow(reynolds, 0.2);
    
    const cd = cd0 + cdi + cdp + cf;
    
    return cd;
  },

  // Calculate forces
  calculateForces(velocity, density, area, cl, cd) {
    const q = 0.5 * density * velocity * velocity;
    const lift = q * area * cl;
    const drag = q * area * cd;
    
    return { lift, drag, dynamicPressure: q };
  },

  // Generate uncertainty bounds based on confidence
  generateBounds(value, confidence) {
    const uncertainty = {
      high: 0.1,
      medium: 0.25,
      low: 0.4
    };
    
    const factor = uncertainty[confidence] || 0.3;
    return {
      min: value * (1 - factor),
      max: value * (1 + factor),
      nominal: value
    };
  },

  // Run complete simulation
  simulate(params) {
    const { velocity, density, area, length, angleOfAttack, thickness, camber, geometry } = params;
    
    const reynolds = this.calculateReynolds(velocity, length, density);
    const regime = this.classifyFlowRegime(reynolds);
    
    const cl = this.calculateLiftCoefficient(angleOfAttack, camber, thickness, reynolds);
    const cd = this.calculateDragCoefficient(angleOfAttack, thickness, camber, reynolds);
    
    const forces = this.calculateForces(velocity, density, area, cl, cd);
    
    const efficiency = cl / Math.max(cd, 0.001);
    
    // Stability indicator (simplified)
    const stability = Math.abs(angleOfAttack) < 10 ? 'stable' : 
                     Math.abs(angleOfAttack) < 15 ? 'marginal' : 'unstable';
    
    return {
      reynolds,
      regime,
      cl: this.generateBounds(cl, regime.confidence),
      cd: this.generateBounds(cd, regime.confidence),
      lift: this.generateBounds(forces.lift, regime.confidence),
      drag: this.generateBounds(forces.drag, regime.confidence),
      efficiency: this.generateBounds(efficiency, regime.confidence),
      dynamicPressure: forces.dynamicPressure,
      stability,
      confidence: regime.confidence
    };
  }
};

// ============================================================================
// GEOMETRY GENERATOR MODULE
// ============================================================================
const GeometryGenerator = {
  generateAirfoil(type, params) {
    const points = [];
    const n = 100;
    
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      let y = 0;
      
      if (type === 'symmetric') {
        // NACA 4-digit symmetric approximation
        const t = params.thickness;
        y = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 
                      0.2843 * x * x * x - 0.1015 * x * x * x * x);
      } else if (type === 'cambered') {
        const m = params.camber;
        const p = 0.4;
        const t = params.thickness;
        
        const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : 
                           m / ((1 - p) * (1 - p)) * ((1 - 2 * p) + 2 * p * x - x * x);
        
        const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 
                            0.2843 * x * x * x - 0.1015 * x * x * x * x);
        
        y = yc + yt;
      } else if (type === 'flat-plate') {
        y = 0;
      }
      
      points.push({ x, y });
    }
    
    // Add lower surface for non-flat-plate
    if (type !== 'flat-plate') {
      for (let i = n - 1; i >= 0; i--) {
        const x = i / n;
        let y = 0;
        
        if (type === 'symmetric') {
          const t = params.thickness;
          y = -5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 
                        0.2843 * x * x * x - 0.1015 * x * x * x * x);
        } else if (type === 'cambered') {
          const m = params.camber;
          const p = 0.4;
          const t = params.thickness;
          
          const yc = x < p ? m / (p * p) * (2 * p * x - x * x) : 
                             m / ((1 - p) * (1 - p)) * ((1 - 2 * p) + 2 * p * x - x * x);
          
          const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 
                              0.2843 * x * x * x - 0.1015 * x * x * x * x);
          
          y = yc - yt;
        }
        
        points.push({ x, y });
      }
    }
    
    return points;
  },

  generateCylinder(radius) {
    const points = [];
    const n = 50;
    
    for (let i = 0; i <= n; i++) {
      const theta = (i / n) * 2 * Math.PI;
      points.push({
        x: 0.5 + radius * Math.cos(theta),
        y: radius * Math.sin(theta)
      });
    }
    
    return points;
  }
};

// ============================================================================
// FLOW FIELD MODULE
// ============================================================================
const FlowField = {
  generateStreamlines(geometry, velocity, angleOfAttack, numLines = 15) {
    const streamlines = [];
    const alpha = angleOfAttack * Math.PI / 180;
    
    for (let i = 0; i < numLines; i++) {
      const startY = -0.5 + (i / (numLines - 1)) * 1;
      const line = [];
      
      let x = -0.5;
      let y = startY;
      
      for (let step = 0; step < 150; step++) {
        line.push({ x, y });
        
        // Simple potential flow approximation
        const dx = 0.01;
        const distToAirfoil = Math.min(...geometry.map(p => 
          Math.sqrt((p.x - x) * (p.x - x) + (p.y - y) * (p.y - y))
        ));
        
        if (distToAirfoil < 0.05) break;
        
        // Flow deflection
        const deflection = Math.exp(-distToAirfoil * 5) * Math.sin(alpha) * 0.1;
        
        x += dx;
        y += deflection;
        
        if (x > 1.5 || Math.abs(y) > 0.8) break;
      }
      
      if (line.length > 10) streamlines.push(line);
    }
    
    return streamlines;
  },

  calculatePressureField(geometry, velocity, density) {
    return geometry.map(point => {
      // Simplified Bernoulli equation
      const localVelocity = velocity * (1 + 0.5 * Math.sin(point.y * Math.PI));
      const pressure = 0.5 * density * (velocity * velocity - localVelocity * localVelocity);
      return pressure;
    });
  }
};

// ============================================================================
// 3D VISUALIZATION COMPONENT
// ============================================================================
const ThreeJSViewer = ({ geometry, streamlines, pressureField, isAnimating }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const geometryMeshRef = useRef(null);
  const streamlineMeshesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.set(0, 0.5, 2.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(4, 20, 0x444444, 0x222222);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      if (isAnimating) {
        timeRef.current += 0.02;
        
        // Rotate camera slightly
        camera.position.x = Math.sin(timeRef.current * 0.1) * 0.5;
        camera.lookAt(0, 0, 0);
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !geometry || geometry.length === 0) return;

    // Remove old geometry
    if (geometryMeshRef.current) {
      sceneRef.current.remove(geometryMeshRef.current);
      geometryMeshRef.current.geometry.dispose();
      geometryMeshRef.current.material.dispose();
    }

    // Create airfoil geometry
    const shape = new THREE.Shape();
    shape.moveTo(geometry[0].x - 0.5, geometry[0].y);
    geometry.forEach(point => {
      shape.lineTo(point.x - 0.5, point.y);
    });
    shape.closePath();

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3
    };

    const geometryThree = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    
    // Color based on pressure
    const material = new THREE.MeshPhongMaterial({
      color: 0x4a9eff,
      emissive: 0x112244,
      specular: 0x447799,
      shininess: 30,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometryThree, material);
    mesh.position.z = -0.15;
    sceneRef.current.add(mesh);
    geometryMeshRef.current = mesh;

  }, [geometry, pressureField]);

  useEffect(() => {
    if (!sceneRef.current || !streamlines) return;

    // Remove old streamlines
    streamlineMeshesRef.current.forEach(mesh => {
      sceneRef.current.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    });
    streamlineMeshesRef.current = [];

    // Create new streamlines
    streamlines.forEach((line, idx) => {
      const points = line.map(p => new THREE.Vector3(p.x - 0.5, p.y, 0));
      const geometryLine = new THREE.BufferGeometry().setFromPoints(points);
      
      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.6 - idx * 0.02, 0.8, 0.5),
        opacity: 0.6,
        transparent: true,
        linewidth: 2
      });

      const mesh = new THREE.Line(geometryLine, material);
      sceneRef.current.add(mesh);
      streamlineMeshesRef.current.push(mesh);
    });

  }, [streamlines]);

  return <div ref={mountRef} className="w-full h-full" />;
};

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
export default function AeroPlatform() {
  const [mode, setMode] = useState('design');
  const [geometryType, setGeometryType] = useState('symmetric');
  
  // Simulation parameters
  const [velocity, setVelocity] = useState(20);
  const [density, setDensity] = useState(1.225);
  const [area, setArea] = useState(0.5);
  const [length, setLength] = useState(1.0);
  const [angleOfAttack, setAngleOfAttack] = useState(5);
  const [thickness, setThickness] = useState(0.12);
  const [camber, setCamber] = useState(0.02);
  
  // Visualization state
  const [isAnimating, setIsAnimating] = useState(false);
  const [showStreamlines, setShowStreamlines] = useState(true);
  const [show3D, setShow3D] = useState(true);
  
  // Results
  const [results, setResults] = useState(null);
  const [geometry, setGeometry] = useState([]);
  const [streamlines, setStreamlines] = useState([]);
  const [pressureField, setPressureField] = useState([]);

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
      geometry: geometryType
    };

    const simResults = PhysicsEngine.simulate(params);
    setResults(simResults);

    const geom = GeometryGenerator.generateAirfoil(geometryType, { thickness, camber });
    setGeometry(geom);

    const streams = FlowField.generateStreamlines(geom, velocity, angleOfAttack);
    setStreamlines(streams);

    const pressure = FlowField.calculatePressureField(geom, velocity, density);
    setPressureField(pressure);
  };

  useEffect(() => {
    runSimulation();
  }, [velocity, density, angleOfAttack, thickness, camber, geometryType]);

  const getConfidenceColor = (confidence) => {
    switch(confidence) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const exportReport = () => {
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

RESULTS
-------
Reynolds Number: ${results?.reynolds.toExponential(2)}
Flow Regime: ${results?.regime.type}
Confidence: ${results?.confidence}

Lift Coefficient (CL): ${results?.cl.nominal.toFixed(3)} [${results?.cl.min.toFixed(3)} - ${results?.cl.max.toFixed(3)}]
Drag Coefficient (CD): ${results?.cd.nominal.toFixed(3)} [${results?.cd.min.toFixed(3)} - ${results?.cd.max.toFixed(3)}]

Lift Force: ${results?.lift.nominal.toFixed(2)} N [${results?.lift.min.toFixed(2)} - ${results?.lift.max.toFixed(2)} N]
Drag Force: ${results?.drag.nominal.toFixed(2)} N [${results?.drag.min.toFixed(2)} - ${results?.drag.max.toFixed(2)} N]

L/D Ratio: ${results?.efficiency.nominal.toFixed(2)}
Stability: ${results?.stability}

NOTES
-----
Results based on reduced-order aerodynamic models.
Ranges indicate uncertainty based on flow regime complexity.
    `.trim();

    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aero_report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Interactive Aerodynamics Platform</h1>
          <p className="text-blue-300">Fast, visual, honest aerodynamic decision-making</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 mb-6">
          {['learning', 'design', 'competition'].map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                mode === m ? 'bg-blue-500' : 'bg-slate-700 hover:bg-slate-600'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)} Mode
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Geometry Selection */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Settings size={20} />
                Geometry
              </h3>
              <select
                value={geometryType}
                onChange={(e) => setGeometryType(e.target.value)}
                className="w-full bg-slate-700 rounded px-3 py-2 mb-4"
              >
                <option value="flat-plate">Flat Plate</option>
                <option value="symmetric">Symmetric Airfoil</option>
                <option value="cambered">Cambered Airfoil</option>
              </select>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Thickness: {thickness.toFixed(2)}</label>
                  <input
                    type="range"
                    min="0.06"
                    max="0.25"
                    step="0.01"
                    value={thickness}
                    onChange={(e) => setThickness(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                {geometryType === 'cambered' && (
                  <div>
                    <label className="text-sm text-gray-300">Camber: {camber.toFixed(3)}</label>
                    <input
                      type="range"
                      min="0"
                      max="0.08"
                      step="0.001"
                      value={camber}
                      onChange={(e) => setCamber(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Environmental Parameters */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Environment</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-300">Velocity: {velocity} m/s</label>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    step="1"
                    value={velocity}
                    onChange={(e) => setVelocity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">Angle of Attack: {angleOfAttack}°</label>
                  <input
                    type="range"
                    min="-20"
                    max="20"
                    step="0.5"
                    value={angleOfAttack}
                    onChange={(e) => setAngleOfAttack(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-300">Air Density: {density} kg/m³</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(parseFloat(e.target.value))}
                    className="w-full bg-slate-700 rounded px-3 py-2"
                  >
                    <option value="1.225">Sea Level (1.225)</option>
                    <option value="1.112">1000m (1.112)</option>
                    <option value="0.909">3000m (0.909)</option>
                    <option value="0.737">5000m (0.737)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm text-gray-300">Chord Length: {length} m</label>
                  <input
                    type="range"
                    min="0.1"
                    max="3"
                    step="0.1"
                    value={length}
                    onChange={(e) => setLength(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* View Controls */}
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-3">Visualization</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={show3D}
                    onChange={(e) => setShow3D(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">3D View</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showStreamlines}
                    onChange={(e) => setShowStreamlines(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Streamlines</span>
                </label>
                <button
                  onClick={() => setIsAnimating(!isAnimating)}
                  className="w-full bg-blue-600 hover:bg-blue-700 rounded px-3 py-2 flex items-center justify-center gap-2"
                >
                  {isAnimating ? <Pause size={16} /> : <Play size={16} />}
                  {isAnimating ? 'Pause' : 'Animate'}
                </button>
              </div>
            </div>
          </div>

          {/* Center Panel - Visualization */}
          <div className="lg:col-span-2 space-y-4">
            {/* 3D Viewer */}
            {show3D && (
              <div className="bg-slate-800 rounded-lg p-4 h-96">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Camera size={20} />
                    3D Geometry View
                  </h3>
                </div>
                <div className="h-80 bg-slate-900 rounded">
                  <ThreeJSViewer
                    geometry={geometry}
                    streamlines={showStreamlines ? streamlines : []}
                    pressureField={pressureField}
                    isAnimating={isAnimating}
                  />
                </div>
              </div>
            )}

            {/* Results Panel */}
            {results && (
              <div className="bg-slate-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp size={20} />
                    Simulation Results
                  </h3>
                  <button
                    onClick={exportReport}
                    className="bg-green-600 hover:bg-green-700 rounded px-3 py-1 flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    Export Report
                  </button>
                </div>

                {/* Confidence Badge */}
                <div className="mb-4 p-3 bg-slate-700 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={20} className={getConfidenceColor(results.confidence)} />
                    <span className="font-medium">Confidence: </span>
                    <span className={`font-bold ${getConfidenceColor(results.confidence)}`}>
                      {results.confidence.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400">
                    Re = {results.reynolds.toExponential(2)} ({results.regime.type})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Lift */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Lift Coefficient</div>
                    <div className="text-2xl font-bold text-blue-400">{results.cl.nominal.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">
                      Range: {results.cl.min.toFixed(3)} - {results.cl.max.toFixed(3)}
                    </div>
                  </div>

                  {/* Drag */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Drag Coefficient</div>
                    <div className="text-2xl font-bold text-red-400">{results.cd.nominal.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">
                      Range: {results.cd.min.toFixed(3)} - {results.cd.max.toFixed(3)}
                    </div>
                  </div>

                  {/* Lift Force */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Lift Force</div>
                    <div className="text-2xl font-bold text-green-400">{results.lift.nominal.toFixed(2)} N</div>
                    <div className="text-xs text-gray-500">
                      Range: {results.lift.min.toFixed(2)} - {results.lift.max.toFixed(2)} N
                    </div>
                  </div>

                  {/* Drag Force */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Drag Force</div>
                    <div className="text-2xl font-bold text-orange-400">{results.drag.nominal.toFixed(2)} N</div>
                    <div className="text-xs text-gray-500">
                      Range: {results.drag.min.toFixed(2)} - {results.drag.max.toFixed(2)} N
                    </div>
                  </div>

                  {/* L/D Ratio */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">L/D Ratio (Efficiency)</div>
                    <div className="text-2xl font-bold text-purple-400">{results.efficiency.nominal.toFixed(2)}</div>
                    <div className="text-xs text-gray-500">
                      Range: {results.efficiency.min.toFixed(2)} - {results.efficiency.max.toFixed(2)}
                    </div>
                  </div>

                  {/* Stability */}
                  <div className="bg-slate-700 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Stability</div>
                    <div className={`text-2xl font-bold ${
                      results.stability === 'stable' ? 'text-green-400' :
                      results.stability === 'marginal' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {results.stability.toUpperCase()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Dynamic Pressure: {results.dynamicPressure.toFixed(1)} Pa
                    </div>
                  </div>
                </div>

                {/* Learning Mode Info */}
                {mode === 'learning' && (
                  <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 rounded-lg border border-blue-700">
                    <div className="flex items-start gap-2">
                      <Info size={20} className="text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-semibold text-blue-300 mb-1">Understanding Your Results:</p>
                        <ul className="space-y-1 text-gray-300">
                          <li>• <strong>Reynolds Number</strong> indicates the flow regime - higher values mean more turbulent flow</li>
                          <li>• <strong>Confidence ranges</strong> account for model uncertainty - use them for safety margins</li>
                          <li>• <strong>L/D ratio</strong> measures efficiency - higher is better for most applications</li>
                          <li>• <strong>{results.regime.type} flow</strong> affects prediction accuracy</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Competition Mode Summary */}
                {mode === 'competition' && (
                  <div className="mt-4 p-3 bg-green-900 bg-opacity-30 rounded-lg border border-green-700">
                    <div className="text-sm">
                      <p className="font-semibold text-green-300 mb-2">Competition Summary:</p>
                      <div className="grid grid-cols-2 gap-2 text-gray-300">
                        <div>Configuration: {geometryType}</div>
                        <div>Stability: {results.stability}</div>
                        <div>Max Lift: {results.lift.max.toFixed(2)} N</div>
                        <div>Min Drag: {results.drag.min.toFixed(2)} N</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Interactive Aerodynamics Platform v1.0 | Reduced-order physics simulation</p>
          <p className="mt-1">Results are estimates with confidence ranges - always validate critical designs</p>
        </div>
      </div>
    </div>
  );
}
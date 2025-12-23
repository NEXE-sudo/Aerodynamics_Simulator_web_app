"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Point, UploadedModel } from "../types";

//@ts-ignore - CapsuleGeometry not available in r128

interface ThreeJSViewerProps {
  geometry: Point[];
  streamlines: Point[][];
  pressureField: number[];
  isAnimating: boolean;
  uploadedModel?: UploadedModel | null;
}

export default function ThreeJSViewer({
  geometry,
  streamlines,
  pressureField,
  isAnimating,
  uploadedModel,
}: ThreeJSViewerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const geometryMeshRef = useRef<THREE.Mesh | THREE.Group | null>(null);
  const streamlineMeshesRef = useRef<THREE.Line[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const [showWireframe, setShowWireframe] = useState(false);

  const [darkBackground, setDarkBackground] = useState(false);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const directionalLightRef = useRef<THREE.DirectionalLight | null>(null);
  const pointLightRef = useRef<THREE.PointLight | null>(null);
  const [showLighting, setShowLighting] = useState(true);

  const [isDragging, setIsDragging] = useState(false);
  const [previousMousePosition, setPreviousMousePosition] = useState({
    x: 0,
    y: 0,
  });
  const rotationRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(2.5);

  // Helper visibility controls
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkBackground ? 0x1a1a1a : 0xf9fafb);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0.5, 2.5);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);
    directionalLightRef.current = directionalLight;

    const pointLight = new THREE.PointLight(0xffffff, 0.5);
    pointLight.position.set(-5, 5, -5);
    scene.add(pointLight);
    pointLightRef.current = pointLight;

    const gridHelper = new THREE.GridHelper(4, 20, 0xe5e7eb, 0xf3f4f6);
    gridHelper.rotation.x = Math.PI / 2;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    const axesHelper = new THREE.AxesHelper(1);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (isAnimating && cameraRef.current) {
        timeRef.current += 0.01;

        // Smooth rotation animation
        if (geometryMeshRef.current) {
          geometryMeshRef.current.rotation.y += 0.005;
        }
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current)
        return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mountRef.current && rendererRef.current?.domElement) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      rendererRef.current?.dispose();
    };
  }, []);

  // Toggle grid visibility
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Toggle axes visibility
  useEffect(() => {
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = showAxes;
    }
  }, [showAxes]);

  // Toggle wireframe mode
  useEffect(() => {
    if (!geometryMeshRef.current) return;

    const updateWireframe = (obj: THREE.Object3D) => {
      if (obj instanceof THREE.Mesh) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            mat.wireframe = showWireframe;
          });
        } else {
          obj.material.wireframe = showWireframe;
        }
      }
    };

    if (geometryMeshRef.current instanceof THREE.Group) {
      geometryMeshRef.current.traverse(updateWireframe);
    } else {
      updateWireframe(geometryMeshRef.current);
    }
  }, [showWireframe]);

  // Update background color
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(
        darkBackground ? 0x1a1a1a : 0xf9fafb
      );
    }
  }, [darkBackground]);

  // Toggle lighting
  useEffect(() => {
    if (ambientLightRef.current) ambientLightRef.current.visible = showLighting;
    if (directionalLightRef.current)
      directionalLightRef.current.visible = showLighting;
    if (pointLightRef.current) pointLightRef.current.visible = showLighting;
  }, [showLighting]);

  // Handle mouse interactions
  useEffect(() => {
    const canvas = rendererRef.current?.domElement;
    if (!canvas) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setPreviousMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !cameraRef.current) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      rotationRef.current.y += deltaX * 0.005;
      rotationRef.current.x += deltaY * 0.005;

      rotationRef.current.x = Math.max(
        -Math.PI / 2,
        Math.min(Math.PI / 2, rotationRef.current.x)
      );

      updateCameraPosition();
      setPreviousMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomRef.current += e.deltaY * 0.001;
      zoomRef.current = Math.max(1, Math.min(10, zoomRef.current));
      updateCameraPosition();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [isDragging, previousMousePosition]);

  const updateCameraPosition = () => {
    if (!cameraRef.current) return;

    const radius = zoomRef.current;
    const x =
      radius *
      Math.sin(rotationRef.current.y) *
      Math.cos(rotationRef.current.x);
    const y = radius * Math.sin(rotationRef.current.x);
    const z =
      radius *
      Math.cos(rotationRef.current.y) *
      Math.cos(rotationRef.current.x);

    cameraRef.current.position.set(x, y + 0.5, z);
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Load uploaded model
  useEffect(() => {
    if (!sceneRef.current || !uploadedModel) return;

    // Remove old generated geometry
    if (geometryMeshRef.current && !uploadedModel) {
      sceneRef.current.remove(geometryMeshRef.current);
      if (geometryMeshRef.current instanceof THREE.Mesh) {
        geometryMeshRef.current.geometry.dispose();
        (geometryMeshRef.current.material as THREE.Material).dispose();
      }
    }

    // Skip creating new geometry if we have an uploaded model
    if (uploadedModel) return;

    const loadModel = async () => {
      try {
        const reader = new FileReader();

        reader.onload = async (e) => {
          if (!e.target?.result || !sceneRef.current) return;

          if (uploadedModel.type === ".obj") {
            // Parse OBJ file
            const text = new TextDecoder().decode(
              e.target.result as ArrayBuffer
            );
            const lines = text.split("\n");
            const vertices: number[] = [];
            const faces: number[] = [];

            lines.forEach((line) => {
              const parts = line.trim().split(/\s+/);
              if (parts[0] === "v") {
                vertices.push(
                  parseFloat(parts[1]),
                  parseFloat(parts[2]),
                  parseFloat(parts[3])
                );
              } else if (parts[0] === "f") {
                for (let i = 1; i <= 3; i++) {
                  const vertexIndex = parseInt(parts[i].split("/")[0]) - 1;
                  faces.push(vertexIndex);
                }
              }
            });

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute(
              "position",
              new THREE.Float32BufferAttribute(vertices, 3)
            );
            geometry.setIndex(faces);
            geometry.computeVertexNormals();

            const material = new THREE.MeshPhongMaterial({
              color: 0x0d9488,
              emissive: 0x042f2e,
              specular: 0x5eead4,
              shininess: 30,
            });

            const mesh = new THREE.Mesh(geometry, material);

            // Center and scale the model
            geometry.computeBoundingBox();
            const box = geometry.boundingBox!;
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1 / maxDim;

            mesh.position.set(
              -center.x * scale,
              -center.y * scale,
              -center.z * scale
            );
            mesh.scale.set(scale, scale, scale);

            sceneRef.current.add(mesh);
            geometryMeshRef.current = mesh;
          } else if (uploadedModel.type === ".stl") {
            // Parse STL file (binary)
            const data = new DataView(e.target.result as ArrayBuffer);
            const isASCII =
              data.byteLength < 84 ||
              new TextDecoder().decode(data.buffer.slice(0, 5)) === "solid";

            let geometry: THREE.BufferGeometry;

            if (!isASCII) {
              // Binary STL
              const triangles = data.getUint32(80, true);
              const vertices = new Float32Array(triangles * 9);
              const normals = new Float32Array(triangles * 9);

              let offset = 84;
              for (let i = 0; i < triangles; i++) {
                const normalX = data.getFloat32(offset, true);
                const normalY = data.getFloat32(offset + 4, true);
                const normalZ = data.getFloat32(offset + 8, true);
                offset += 12;

                for (let j = 0; j < 3; j++) {
                  const idx = i * 9 + j * 3;
                  vertices[idx] = data.getFloat32(offset, true);
                  vertices[idx + 1] = data.getFloat32(offset + 4, true);
                  vertices[idx + 2] = data.getFloat32(offset + 8, true);
                  normals[idx] = normalX;
                  normals[idx + 1] = normalY;
                  normals[idx + 2] = normalZ;
                  offset += 12;
                }
                offset += 2; // Skip attribute byte count
              }

              geometry = new THREE.BufferGeometry();
              geometry.setAttribute(
                "position",
                new THREE.BufferAttribute(vertices, 3)
              );
              geometry.setAttribute(
                "normal",
                new THREE.BufferAttribute(normals, 3)
              );
            } else {
              // ASCII STL - create placeholder
              geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            }

            const material = new THREE.MeshPhongMaterial({
              color: 0x0d9488,
              emissive: 0x042f2e,
              specular: 0x5eead4,
              shininess: 30,
            });

            const mesh = new THREE.Mesh(geometry, material);

            // Center and scale
            geometry.computeBoundingBox();
            const box = geometry.boundingBox!;
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 1 / maxDim;

            mesh.position.set(
              -center.x * scale,
              -center.y * scale,
              -center.z * scale
            );
            mesh.scale.set(scale, scale, scale);

            sceneRef.current.add(mesh);
            geometryMeshRef.current = mesh;
          } else {
            // GLB/GLTF - Basic parser (limited support without GLTFLoader)
            console.warn(
              "GLB/GLTF format: Showing simplified representation. For full model support, GLTFLoader is required."
            );

            // Create a representative mesh based on file size
            const group = new THREE.Group();
            const geometry = new THREE.BoxGeometry(0.8, 0.2, 0.4);
            const material = new THREE.MeshPhongMaterial({
              color: 0x0d9488,
              emissive: 0x042f2e,
              specular: 0x5eead4,
              shininess: 30,
            });
            const mesh = new THREE.Mesh(geometry, material);

            // Add text notification
            const canvas = document.createElement("canvas");
            canvas.width = 512;
            canvas.height = 128;
            const ctx = canvas.getContext("2d")!;
            ctx.fillStyle = "#ffffff";
            ctx.font = "bold 24px Arial";
            ctx.textAlign = "center";
            ctx.fillText("GLB/GLTF Preview", 256, 64);
            ctx.font = "18px Arial";
            ctx.fillText(uploadedModel.name, 256, 100);

            const texture = new THREE.CanvasTexture(canvas);
            const labelGeometry = new THREE.PlaneGeometry(1, 0.25);
            const labelMaterial = new THREE.MeshBasicMaterial({
              map: texture,
              transparent: true,
            });
            const label = new THREE.Mesh(labelGeometry, labelMaterial);
            label.position.y = 0.3;

            group.add(mesh);
            group.add(label);
            sceneRef.current.add(group);
            geometryMeshRef.current = group;
          }
        };

        reader.readAsArrayBuffer(uploadedModel.file);
      } catch (error) {
        console.error("Error loading model:", error);
      }
    };

    loadModel();
  }, [uploadedModel]);

  // Update generated geometry
  useEffect(() => {
    if (!sceneRef.current || !geometry || geometry.length === 0) return;

    if (geometryMeshRef.current) {
      sceneRef.current.remove(geometryMeshRef.current);
      if (geometryMeshRef.current instanceof THREE.Mesh) {
        geometryMeshRef.current.geometry.dispose();
        (geometryMeshRef.current.material as THREE.Material).dispose();
      }
    }

    const shape = new THREE.Shape();
    shape.moveTo(geometry[0].x - 0.5, geometry[0].y);
    geometry.forEach((point) => {
      shape.lineTo(point.x - 0.5, point.y);
    });
    shape.closePath();

    const extrudeSettings = {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3,
    };

    const geometryThree = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    const material = new THREE.MeshPhongMaterial({
      color: 0x0d9488,
      emissive: 0x042f2e,
      specular: 0x5eead4,
      shininess: 30,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometryThree, material);
    mesh.position.z = -0.15;
    sceneRef.current.add(mesh);
    geometryMeshRef.current = mesh;
  }, [geometry, pressureField, uploadedModel]);

  // Update streamlines
  useEffect(() => {
    if (!sceneRef.current || !streamlines) return;

    streamlineMeshesRef.current.forEach((mesh) => {
      sceneRef.current!.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    streamlineMeshesRef.current = [];

    streamlines.forEach((line, idx) => {
      const points = line.map((p) => new THREE.Vector3(p.x - 0.5, p.y, 0));
      const geometryLine = new THREE.BufferGeometry().setFromPoints(points);

      const material = new THREE.LineBasicMaterial({
        color: new THREE.Color().setHSL(0.55 - idx * 0.02, 0.7, 0.5),
        opacity: 0.6,
        transparent: true,
      });

      const mesh = new THREE.Line(geometryLine, material);
      sceneRef.current!.add(mesh);
      streamlineMeshesRef.current.push(mesh);
    });
  }, [streamlines]);

  return (
    <div className="relative w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 min-h-[600px]">
      <div ref={mountRef} className="w-full h-full cursor-move" />

      {/* Controls overlay */}
      <div className="absolute top-4 left-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-lg p-3 shadow-lg text-xs space-y-3">
        <div>
          <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            3D Controls
          </div>
          <div className="space-y-1 text-gray-700">
            <div>
              🖱️ <strong>Click + Drag:</strong> Rotate
            </div>
            <div>
              🔍 <strong>Scroll:</strong> Zoom
            </div>
            <div>
              ▶️ <strong>Animation:</strong> {isAnimating ? "ON" : "OFF"}
            </div>
          </div>
        </div>

        {/* Helper Toggles */}
        <div className="pt-3 border-t border-gray-300">
          <div className="font-semibold text-gray-900 mb-2">
            Display Options
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Show Grid
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition">
              <input
                type="checkbox"
                checked={showAxes}
                onChange={(e) => setShowAxes(e.target.checked)}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Show Axes
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition">
              <input
                type="checkbox"
                checked={showWireframe}
                onChange={(e) => setShowWireframe(e.target.checked)}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Wireframe Mode
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition">
              <input
                type="checkbox"
                checked={darkBackground}
                onChange={(e) => setDarkBackground(e.target.checked)}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Dark Background
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded transition">
              <input
                type="checkbox"
                checked={showLighting}
                onChange={(e) => setShowLighting(e.target.checked)}
                className="w-4 h-4 accent-teal-600 cursor-pointer"
              />
              <span className="text-gray-700 dark:text-gray-300">
                Scene Lighting
              </span>
            </label>
          </div>
        </div>

        {/* Camera Info */}
        <div className="pt-3 border-t border-gray-300 text-xs text-gray-500">
          <div>Zoom: {zoomRef.current.toFixed(1)}x</div>
          <div>Rotation: {(rotationRef.current.y * 57.3).toFixed(0)}°</div>
        </div>
      </div>

      {/* Model info */}
      {uploadedModel && (
        <div className="absolute top-4 right-4 bg-teal-600 text-white rounded-lg p-3 shadow-lg text-xs">
          <div className="font-semibold mb-1">Custom Model</div>
          <div>{uploadedModel.name}</div>
        </div>
      )}
    </div>
  );
}

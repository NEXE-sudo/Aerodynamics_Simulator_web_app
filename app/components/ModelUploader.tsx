"use client";

import { useState, useRef } from "react";
import { Upload, X, FileIcon, AlertCircle } from "lucide-react";
import { UploadedModel } from "../types";

interface ModelUploaderProps {
  onModelUpload: (model: UploadedModel | null) => void;
  currentModel: UploadedModel | null;
  onClear?: () => void;
}

export default function ModelUploader({
  onModelUpload,
  currentModel,
  onClear,
}: ModelUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    const validTypes = [
      "model/gltf-binary",
      "model/gltf+json",
      "model/obj",
      "application/octet-stream",
    ];
    const validExtensions = [".glb", ".gltf", ".obj", ".stl"];

    const fileExtension = file.name
      .toLowerCase()
      .slice(file.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      alert("Please upload a valid 3D model file (.glb, .gltf, .obj, or .stl)");
      return;
    }

    const url = URL.createObjectURL(file);
    onModelUpload({
      file,
      url,
      name: file.name,
      type: fileExtension as ".glb" | ".gltf" | ".obj" | ".stl",
    });
  };

  const handleRemove = () => {
    if (currentModel) {
      URL.revokeObjectURL(currentModel.url);
    }
    onModelUpload(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (onClear) {
      onClear();
    }
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-lg">
      <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <Upload size={18} className="text-purple-600 dark:text-purple-400" />
        3D Model Upload
      </h3>

      {!currentModel ? (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
            dragActive
              ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 scale-105"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-purple-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".glb,.gltf,.obj,.stl"
            onChange={handleChange}
          />

          <Upload
            size={48}
            className={`mx-auto mb-4 ${
              dragActive ? "text-purple-500" : "text-gray-400"
            }`}
          />

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
            Drag and drop your 3D model here
          </p>

          <button
            onClick={handleButtonClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg transition-all text-sm font-semibold shadow-md hover:shadow-lg active:scale-95"
          >
            Browse Files
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
            Supported: .glb, .gltf, .obj, .stl
          </p>
        </div>
      ) : (
        <div>
          <div className="bg-purple-50 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileIcon
                  size={28}
                  className="text-purple-600 dark:text-purple-400"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {currentModel.name}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {currentModel.type.toUpperCase()} file
                  </p>
                </div>
              </div>
              <button
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                title="Remove model"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <button
            onClick={handleRemove}
            className="w-full mt-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg transition text-sm font-medium"
          >
            Back to Generated Airfoil
          </button>
        </div>
      )}

      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle
            size={16}
            className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
          />
          <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
            <strong>Note:</strong> Uploaded models replace the airfoil shape
            visually. Physics calculations still use the generated airfoil
            geometry.
          </p>
        </div>
      </div>
    </div>
  );
}

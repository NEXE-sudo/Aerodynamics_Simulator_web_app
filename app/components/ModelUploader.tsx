"use client";

import { useState, useRef } from "react";
import { Upload, X, FileIcon } from "lucide-react";
import { UploadedModel } from "../types";

interface ModelUploaderProps {
  onModelUpload: (model: UploadedModel | null) => void;
  currentModel: UploadedModel | null;
}

export default function ModelUploader({
  onModelUpload,
  currentModel,
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
      type: fileExtension,
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
  };

  const handleButtonClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        <Upload size={20} className="text-teal-600" />
        Upload 3D Model
      </h3>

      {!currentModel ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
            dragActive
              ? "border-teal-500 bg-teal-50 dark:bg-teal-950"
              : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
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
              dragActive ? "text-teal-500" : "text-gray-400"
            }`}
          />

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop your 3D model here, or
          </p>

          <button
            onClick={handleButtonClick}
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded transition text-sm font-medium"
          >
            Browse Files
          </button>

          <p className="text-xs text-gray-500 mt-3">
            Supported formats: .glb, .gltf, .obj, .stl
          </p>
        </div>
      ) : (
        <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileIcon size={24} className="text-teal-600" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {currentModel.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {currentModel.type.toUpperCase()} file
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="text-red-600 hover:text-red-700 transition"
              title="Remove model"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700 rounded text-xs text-gray-700 dark:text-gray-300">
        <p className="font-semibold text-blue-900 dark:text-blue-300 mb-1">
          Note:
        </p>
        <p>
          Uploaded models will replace the generated airfoil geometry in the 3D
          view. Aerodynamic calculations will still use the generated geometry.
        </p>
      </div>
    </div>
  );
}

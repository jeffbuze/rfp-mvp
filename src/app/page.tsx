"use client";

import { useState, useCallback } from "react";

interface RFPData {
  title: string;
  rawText: string;
  requirements: Array<{ text: string; category: string }>;
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rfpData, setRfpData] = useState<RFPData | null>(null);

  const validateFile = (fileToValidate: File): string | null => {
    // Check file type
    if (fileToValidate.type !== "application/pdf") {
      return "Please upload a PDF file";
    }

    // Check file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileToValidate.size > maxSize) {
      return "File size must be less than 10MB";
    }

    return null;
  };

  const handleFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setFile(null);
      return;
    }

    setError(null);
    setFile(selectedFile);
    setRfpData(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileSelect(selectedFile);
      }
    },
    [handleFileSelect]
  );

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setRfpData(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-rfp", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to extract RFP data");
      }

      const data = await response.json();
      setRfpData(data.output);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const groupRequirementsByCategory = (
    requirements: Array<{ text: string; category: string }>
  ): Record<string, string[]> => {
    return requirements.reduce((acc, req) => {
      if (!acc[req.category]) {
        acc[req.category] = [];
      }
      acc[req.category].push(req.text);
      return acc;
    }, {} as Record<string, string[]>);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-4xl flex-col gap-8 py-16 px-8 sm:px-16">
        <div className="text-center">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
            RFP Extraction Tool
          </h1>
          <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Upload a PDF RFP document to extract key information automatically
          </p>
        </div>

        {/* File Upload Area */}
        <div
          className={`relative rounded-lg border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            accept=".pdf,application/pdf"
            onChange={handleFileInputChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            disabled={isUploading}
          />
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-12 w-12 text-zinc-400 dark:text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-center">
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                {file ? file.name : "Drag and drop a PDF file here"}
              </p>
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                or click to browse (Max 10MB)
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950/20 dark:text-red-400">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Upload Button */}
        {file && !isUploading && (
          <button
            onClick={handleUpload}
            className="w-full rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Extract RFP Data
          </button>
        )}

        {/* Loading State */}
        {isUploading && (
          <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-100 p-8 dark:bg-zinc-800">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-200"></div>
            <p className="text-zinc-600 dark:text-zinc-400">
              Processing PDF and extracting RFP data...
            </p>
          </div>
        )}

        {/* Results Display */}
        {rfpData && (
          <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
              Extracted RFP Information
            </h2>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Title
                </h3>
                <p className="mt-2 text-lg text-zinc-900 dark:text-zinc-50">
                  {rfpData.title}
                </p>
              </div>

              {/* Raw Text */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Raw Text
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {rfpData.rawText}
                </p>
              </div>

              {/* Requirements */}
              <div>
                <h3 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Requirements
                </h3>
                <div className="mt-4 space-y-6">
                  {Object.entries(
                    groupRequirementsByCategory(rfpData.requirements)
                  ).map(([category, texts]) => (
                    <div key={category}>
                      <h4 className="mb-2 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                        {category}
                      </h4>
                      <ul className="space-y-2">
                        {texts.map((text, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-2 text-zinc-700 dark:text-zinc-300"
                          >
                            <span className="mt-1 text-zinc-400 dark:text-zinc-600">
                              •
                            </span>
                            <span>{text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

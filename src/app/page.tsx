"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface RFPData {
  title: string;
  rawText: string;
  requirements: Array<{ text: string; category: string }>;
}

interface BidData {
  title: string;
  rawText: string;
  totalCost: number;
  timeline: string;
  requirements: Array<{
    text: string;
    category: string;
    isSatisfied: boolean;
    reason: string;
  }>;
}

interface AnalysisData {
  recommendation: string;
  mainRecommendationReason: string;
  supportingRecommendationPoints: string[];
  openQuestions: Array<{
    companyName: string;
    openQuestions: string[];
  }>;
}

const STORAGE_KEY = "rfp-bid-project";

export default function Home() {
  // RFP state
  const [rfpFile, setRfpFile] = useState<File | null>(null);
  const [isRfpDragging, setIsRfpDragging] = useState(false);
  const [isRfpUploading, setIsRfpUploading] = useState(false);
  const [rfpData, setRfpData] = useState<RFPData | null>(null);

  // Bid state
  const [bidFile, setBidFile] = useState<File | null>(null);
  const [isBidDragging, setIsBidDragging] = useState(false);
  const [isBidUploading, setIsBidUploading] = useState(false);
  const [bids, setBids] = useState<BidData[]>([]);
  const [expandedBidIndex, setExpandedBidIndex] = useState<number | null>(null);

  // Analysis state
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs for file inputs to clear them after processing
  const rfpFileInputRef = useRef<HTMLInputElement>(null);
  const bidFileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.rfpData) setRfpData(data.rfpData);
        if (data.bids) setBids(data.bids);
        if (data.analysisData) setAnalysisData(data.analysisData);
      } catch (err) {
        console.error("Failed to load stored data:", err);
      }
    }
  }, []);

  // Save to localStorage when data changes
  useEffect(() => {
    if (rfpData || bids.length > 0 || analysisData) {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rfpData, bids, analysisData })
      );
    }
  }, [rfpData, bids, analysisData]);

  const validateFile = (fileToValidate: File): string | null => {
    if (fileToValidate.type !== "application/pdf") {
      return "Please upload a PDF file";
    }
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (fileToValidate.size > maxSize) {
      return "File size must be less than 10MB";
    }
    return null;
  };

  const handleStartNewProject = () => {
    setRfpFile(null);
    setRfpData(null);
    setBidFile(null);
    setBids([]);
    setExpandedBidIndex(null);
    setAnalysisData(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // RFP handlers
  const handleRfpFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setRfpFile(null);
      return;
    }
    setError(null);
    setRfpFile(selectedFile);
  }, []);

  const handleRfpDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsRfpDragging(true);
  }, []);

  const handleRfpDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsRfpDragging(false);
  }, []);

  const handleRfpDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsRfpDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleRfpFileSelect(droppedFile);
      }
    },
    [handleRfpFileSelect]
  );

  const handleRfpFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleRfpFileSelect(selectedFile);
      }
    },
    [handleRfpFileSelect]
  );

  const handleRfpUpload = useCallback(async () => {
    if (!rfpFile) return;

    setIsRfpUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", rfpFile);

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
      setRfpFile(null);
      // Clear the file input
      if (rfpFileInputRef.current) {
        rfpFileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsRfpUploading(false);
    }
  }, [rfpFile]);

  // Auto-trigger RFP processing when file is selected
  useEffect(() => {
    if (rfpFile && !isRfpUploading) {
      handleRfpUpload();
    }
  }, [rfpFile, isRfpUploading, handleRfpUpload]);

  // Bid handlers
  const handleBidFileSelect = useCallback((selectedFile: File) => {
    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      setBidFile(null);
      return;
    }
    setError(null);
    setBidFile(selectedFile);
  }, []);

  const handleBidDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsBidDragging(true);
  }, []);

  const handleBidDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsBidDragging(false);
  }, []);

  const handleBidDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsBidDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleBidFileSelect(droppedFile);
      }
    },
    [handleBidFileSelect]
  );

  const handleBidFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleBidFileSelect(selectedFile);
      }
    },
    [handleBidFileSelect]
  );

  const handleBidUpload = useCallback(async () => {
    if (!bidFile || !rfpData) return;

    setIsBidUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", bidFile);
      formData.append("requirements", JSON.stringify(rfpData.requirements));

      const response = await fetch("/api/process-bid", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process bid");
      }

      const data = await response.json();
      setBids((prev) => [...prev, data.output]);
      setBidFile(null);
      // Clear the file input
      if (bidFileInputRef.current) {
        bidFileInputRef.current.value = "";
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsBidUploading(false);
    }
  }, [bidFile, rfpData]);

  // Auto-trigger bid processing when file is selected
  useEffect(() => {
    if (bidFile && rfpData && !isBidUploading) {
      handleBidUpload();
    }
  }, [bidFile, rfpData, isBidUploading, handleBidUpload]);

  // Analysis handler
  const handleAnalyzeAll = useCallback(async () => {
    if (!rfpData || bids.length === 0) {
      setError("Please upload an RFP and at least one bid before analyzing");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/analyze-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rfp: rfpData, bids }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze bids");
      }

      const data = await response.json();
      setAnalysisData(data.output);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [rfpData, bids]);

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

  const getSatisfactionSummary = (bid: BidData) => {
    const satisfied = bid.requirements.filter((r) => r.isSatisfied).length;
    const total = bid.requirements.length;
    return { satisfied, total };
  };

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-black dark:text-zinc-50">
              RFP Bid Assessment Tool
            </h1>
            <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
              Upload an RFP and assess multiple bids against its requirements
            </p>
          </div>
          {(rfpData || bids.length > 0) && (
            <button
              onClick={handleStartNewProject}
              className="rounded-lg bg-zinc-900 px-4 py-2 font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Start New Project
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-950/20 dark:text-red-400">
            <p className="font-medium">Error: {error}</p>
          </div>
        )}

        {/* Split Layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left Column - RFP (40%) */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                RFP
              </h2>

              {/* RFP Upload Area */}
              {!rfpData && (
                <div
                  className={`relative rounded-lg border-2 border-dashed p-8 transition-colors ${
                    isRfpDragging
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                      : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                  }`}
                  onDragOver={handleRfpDragOver}
                  onDragLeave={handleRfpDragLeave}
                  onDrop={handleRfpDrop}
                >
                  <input
                    ref={rfpFileInputRef}
                    type="file"
                    id="rfp-upload"
                    accept=".pdf,application/pdf"
                    onChange={handleRfpFileInputChange}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    disabled={isRfpUploading}
                  />
                  <div className="flex flex-col items-center gap-4">
                    <svg
                      className="h-10 w-10 text-zinc-400 dark:text-zinc-600"
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
                      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                        {rfpFile
                          ? rfpFile.name
                          : "Drag and drop an RFP PDF here"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        or click to browse (Max 10MB)
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* RFP Loading State */}
              {isRfpUploading && (
                <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-100 p-8 dark:bg-zinc-800">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-200"></div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Processing PDF and extracting RFP data...
                  </p>
                </div>
              )}

              {/* RFP Display */}
              {rfpData && (
                <div className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900">
                  <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                    {rfpData.title}
                  </h3>

                  <div>
                    <h4 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      Requirements
                    </h4>
                    <div className="mt-4 space-y-4">
                      {Object.entries(
                        groupRequirementsByCategory(rfpData.requirements)
                      ).map(([category, texts]) => (
                        <div key={category}>
                          <h5 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {category}
                          </h5>
                          <ul className="space-y-1.5">
                            {texts.map((text, index) => (
                              <li
                                key={index}
                                className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <span className="mt-1.5 text-zinc-400 dark:text-zinc-600">
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
              )}
            </div>
          </div>

          {/* Right Column - Bids (60%) */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                Bids
              </h2>

              {/* Bid Upload Area */}
              <div
                className={`relative rounded-lg border-2 border-dashed p-8 transition-colors ${
                  isBidDragging
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
                    : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                } ${!rfpData ? "opacity-50" : ""}`}
                onDragOver={handleBidDragOver}
                onDragLeave={handleBidDragLeave}
                onDrop={handleBidDrop}
              >
                <input
                  ref={bidFileInputRef}
                  type="file"
                  id="bid-upload"
                  accept=".pdf,application/pdf"
                  onChange={handleBidFileInputChange}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  disabled={isBidUploading || !rfpData}
                />
                <div className="flex flex-col items-center gap-4">
                  <svg
                    className="h-10 w-10 text-zinc-400 dark:text-zinc-600"
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
                    <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                      {bidFile
                        ? bidFile.name
                        : !rfpData
                          ? "Upload RFP first to enable bid upload"
                          : "Drag and drop a bid PDF here"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                      or click to browse (Max 10MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Bid Loading State */}
              {isBidUploading && (
                <div className="flex flex-col items-center gap-4 rounded-lg bg-zinc-100 p-8 dark:bg-zinc-800">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-200"></div>
                  <p className="text-zinc-600 dark:text-zinc-400">
                    Processing bid and assessing requirements...
                  </p>
                </div>
              )}

              {/* Bids List */}
              {bids.length > 0 && (
                <div className="space-y-4">
                  {bids.map((bid, index) => {
                    const summary = getSatisfactionSummary(bid);
                    const isExpanded = expandedBidIndex === index;
                    return (
                      <div
                        key={index}
                        className="rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <button
                          onClick={() =>
                            setExpandedBidIndex(isExpanded ? null : index)
                          }
                          className="w-full px-6 py-4 text-left"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                                {bid.title}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                                <p>
                                  {summary.satisfied} of {summary.total}{" "}
                                  requirements satisfied
                                </p>
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                                  Total Cost:{" "}
                                  {new Intl.NumberFormat("en-US", {
                                    style: "currency",
                                    currency: "USD",
                                  }).format(bid.totalCost)}
                                </span>
                                <span className="text-zinc-600 dark:text-zinc-400">
                                  Timeline: {bid.timeline}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                  summary.satisfied === summary.total
                                    ? "bg-green-100 text-green-800 dark:bg-green-950/20 dark:text-green-400"
                                    : summary.satisfied / summary.total >= 0.7
                                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400"
                                      : "bg-red-100 text-red-800 dark:bg-red-950/20 dark:text-red-400"
                                }`}
                              >
                                {Math.round(
                                  (summary.satisfied / summary.total) * 100
                                )}
                                %
                              </span>
                              <svg
                                className={`h-5 w-5 text-zinc-400 transition-transform ${
                                  isExpanded ? "rotate-180" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </div>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-zinc-200 px-6 py-4 dark:border-zinc-700">
                            <div className="space-y-6">
                              {Object.entries(
                                groupRequirementsByCategory(
                                  bid.requirements.map((r) => ({
                                    text: r.text,
                                    category: r.category,
                                  }))
                                )
                              ).map(([category, texts]) => (
                                <div key={category}>
                                  <h4 className="mb-3 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                                    {category}
                                  </h4>
                                  <ul className="space-y-3">
                                    {texts.map((text, textIndex) => {
                                      const requirement = bid.requirements.find(
                                        (r) => r.text === text
                                      );
                                      if (!requirement) return null;
                                      return (
                                        <li
                                          key={textIndex}
                                          className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
                                        >
                                          <div className="flex items-start gap-3">
                                            <span
                                              className={`mt-0.5 shrink-0 ${
                                                requirement.isSatisfied
                                                  ? "text-green-600 dark:text-green-400"
                                                  : "text-red-600 dark:text-red-400"
                                              }`}
                                            >
                                              {requirement.isSatisfied ? (
                                                <svg
                                                  className="h-5 w-5"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                              ) : (
                                                <svg
                                                  className="h-5 w-5"
                                                  fill="currentColor"
                                                  viewBox="0 0 20 20"
                                                >
                                                  <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                    clipRule="evenodd"
                                                  />
                                                </svg>
                                              )}
                                            </span>
                                            <div className="flex-1">
                                              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                                {text}
                                              </p>
                                              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                {requirement.reason}
                                              </p>
                                            </div>
                                          </div>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Analyze All Button */}
              {rfpData && bids.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={handleAnalyzeAll}
                    disabled={isAnalyzing}
                    className={`w-full rounded-lg px-6 py-3 font-medium text-white transition-colors ${
                      isAnalyzing
                        ? "cursor-not-allowed bg-zinc-400 dark:bg-zinc-600"
                        : "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    }`}
                  >
                    {isAnalyzing ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Analyzing bids...
                      </span>
                    ) : (
                      "Analyze All Bids"
                    )}
                  </button>
                </div>
              )}

              {/* Analysis Results */}
              {analysisData && (
                <div className="mt-6 space-y-6">
                  <h2 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                    Analysis Results
                  </h2>

                  {/* Recommendation Card */}
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950/20">
                    <h3 className="mb-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Recommendation
                    </h3>
                    <p className="mb-4 text-base font-medium text-blue-800 dark:text-blue-200">
                      {analysisData.recommendation}
                    </p>
                    <div>
                      <h4 className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                        Reasoning
                      </h4>
                      <p className="mb-4 text-sm leading-relaxed text-blue-700 dark:text-blue-300">
                        {analysisData.mainRecommendationReason}
                      </p>
                      {analysisData.supportingRecommendationPoints &&
                        analysisData.supportingRecommendationPoints.length > 0 && (
                          <div>
                            <h4 className="mb-2 text-sm font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                              Supporting Points
                            </h4>
                            <ul className="space-y-2">
                              {analysisData.supportingRecommendationPoints.map(
                                (point, index) => (
                                  <li
                                    key={index}
                                    className="flex items-start gap-2 text-sm leading-relaxed text-blue-700 dark:text-blue-300"
                                  >
                                    <span className="mt-1 shrink-0 text-blue-600 dark:text-blue-400">
                                      •
                                    </span>
                                    <span>{point}</span>
                                  </li>
                                )
                              )}
                            </ul>
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Open Questions */}
                  {analysisData.openQuestions.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                        Open Questions
                      </h3>
                      {analysisData.openQuestions.map((company, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-900"
                        >
                          <h4 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                            {company.companyName}
                          </h4>
                          <ul className="space-y-3">
                            {company.openQuestions.map((question, qIndex) => (
                              <li
                                key={qIndex}
                                className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300"
                              >
                                <span className="mt-1 shrink-0 text-zinc-400 dark:text-zinc-600">
                                  •
                                </span>
                                <span>{question}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

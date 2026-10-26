"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [docType, setDocType] = useState<"syllabus" | "notes" | "past_paper">("syllabus");
  const [docName, setDocName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<string>("");
  const [successResult, setSuccessResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [existingDocs, setExistingDocs] = useState<any[]>([]);

  const processingSteps = [
    "Uploading document payload",
    "Extracting academic text and structure",
    "Chunking text (~350 words, 40-word overlap)",
    "Generating 768-dim embeddings via Gemini",
  ];

  const loadDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.documents) setExistingDocs(data.documents);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setFileName(file.name);
    setErrorMsg(null);
    if (!docName) {
      setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }

    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setTextContent(`[PDF file attached: ${file.name} (${Math.round(file.size / 1024)} KB) — text will be extracted on server via pdf-parse]`);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setTextContent(content);
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSample = (sampleType: "dsa" | "chem" | "econ") => {
    setSelectedFile(null);
    setFileName("");
    setErrorMsg(null);
    if (sampleType === "dsa") {
      setDocName("CS201 Advanced Tree Structures & Balanced AVL Notes");
      setDocType("notes");
      setTextContent(`Section 1: AVL Trees and Rotations
An AVL tree is a strictly balanced binary search tree with height balance condition: for every internal node v, the heights of the children of v differ by at most 1.
When an insertion or deletion unbalances the AVL tree, we rebalance using four standard rotations:
1. Left-Left (Single Right Rotation): Applied when the left child of an unbalanced node has a left child.
2. Right-Right (Single Left Rotation): Applied when the right child of an unbalanced node has a right child.
3. Left-Right (Double Rotation): First rotate left on the left child, then rotate right on the unbalanced root.
4. Right-Left (Double Rotation): First rotate right on the right child, then rotate left on the unbalanced root.
Search, insertion, and deletion operations in an AVL tree are all guaranteed O(log n) time complexity.

Section 2: Red-Black Trees Invariants
A Red-Black tree is a binary search tree satisfying:
1. Every node is either red or black.
2. The root is always black.
3. If a node is red, both of its children must be black (no adjacent red nodes).
4. Every path from a node to any of its descendant NIL leaves contains the same number of black nodes (black-height).`);
    } else if (sampleType === "chem") {
      setDocName("CHEM301 Organic Chemistry: Reaction Mechanisms");
      setDocType("syllabus");
      setTextContent(`Unit 1: Nucleophilic Substitution (SN1 vs SN2)
Section 1.1: The SN2 Mechanism
SN2 reactions proceed via a single concerted, bimolecular step with backside nucleophilic attack. This results in complete inversion of stereochemical configuration (Walden inversion). The rate law is Rate = k[Substrate][Nucleophile]. Steric hindrance is the overriding factor: primary alkyl halides react fastest (Methyl > 1° > 2° >> 3°). Polar aprotic solvents (such as DMSO, acetone, DMF) accelerate SN2 reactions by solvating cations while leaving the nucleophile naked and reactive.

Section 1.2: The SN1 Mechanism
SN1 reactions proceed via a two-step, unimolecular mechanism involving rate-limiting heterolytic cleavage to form a planar carbocation intermediate. Nucleophilic attack can occur from either face of the carbocation, yielding a racemic mixture of enantiomers. Tertiary substrates react fastest due to hyperconjugation and alkyl group stabilization (3° > 2° >> 1°). Polar protic solvents (water, ethanol) stabilize the leaving group and carbocation.`);
    } else {
      setDocName("ECON102 Principles of Microeconomics Syllabus");
      setDocType("syllabus");
      setTextContent(`Module 1: Market Equilibrium & Price Elasticity
Section 1: Price Elasticity of Demand (PED)
Price Elasticity of Demand measures the percentage change in quantity demanded in response to a percentage change in price. PED = (% Change in Quantity Demanded) / (% Change in Price). When PED > 1, demand is elastic; a price decrease leads to an increase in total revenue. When PED < 1, demand is inelastic; price and total revenue move in the same direction. When PED = 1, demand is unit elastic.

Section 2: Market Structures & Deadweight Loss
In Perfect Competition, firms are price takers with P = MR = MC in long-run equilibrium. In a Pure Monopoly, the single seller faces a downward-sloping demand curve with MR < P. The monopolist restricts output below competitive levels, creating a deadweight loss to society.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && !textContent.trim()) return;

    setIsProcessing(true);
    setSuccessResult(null);
    setErrorMsg(null);
    setCurrentStep(0);
    setStepStatus(processingSteps[0]);

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = Math.min(prev + 1, processingSteps.length - 1);
        setStepStatus(processingSteps[next]);
        return next;
      });
    }, 600);

    try {
      let res: Response;
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("name", docName || selectedFile.name.replace(/\.[^/.]+$/, ""));
        formData.append("type", docType);
        res = await fetch("/api/ingest", {
          method: "POST",
          body: formData,
        });
      } else {
        res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: docName || "Uploaded Material",
            type: docType,
            plainText: textContent,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to ingest document");
      }

      setSuccessResult(data);
      await loadDocuments();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to ingest study material.");
    } finally {
      clearInterval(stepInterval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Ingest Study Material</h1>
        <p className="text-xs text-slate-500 mt-1">
          Upload syllabi, lecture notes, or past exams. Chunks and embeddings are stored with section references.
        </p>
      </div>

      {/* Guided Progress Indicator */}
      <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
            1
          </span>
          <span className="text-xs font-bold text-indigo-950">Current Step: Ingest &amp; Vectorize</span>
        </div>
        <div className="text-xs text-indigo-700/80 hidden sm:block">
          Next &rarr; Topic Map Extraction &rarr; Diagnostic Quiz
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={handleSubmit as any}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Upload & Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            {/* Document Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Document Classification
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "syllabus", label: "Syllabus", desc: "Topic structure" },
                  { id: "notes", label: "Lecture Notes", desc: "Detailed content" },
                  { id: "past_paper", label: "Past Paper", desc: "Exam questions" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDocType(t.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      docType === t.id
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold shadow-xs"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <div className="text-xs">{t.label}</div>
                    <div className="text-[10px] text-slate-400">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Document Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title
              </label>
              <input
                type="text"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., CS201 Unit 2 - Trees & Graphs"
                required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>

            {/* File Drag and Drop / Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Upload File or Paste Text
              </label>
              <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="file-upload"
                  accept=".txt,.md,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    {fileName ? fileName : "Click to browse or drop .pdf, .txt, or .md file here"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Supports PDF (via pdf-parse), .txt, .md, or paste directly below
                  </div>
                </label>
              </div>
            </div>

            {/* Textarea for pasted notes */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700">Raw Text Content</label>
                <span className="text-[10px] text-slate-400">
                  {textContent.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                rows={6}
                value={textContent}
                onChange={(e) => {
                  setSelectedFile(null);
                  setTextContent(e.target.value);
                }}
                placeholder="Paste chapter notes, lecture slides, syllabus topics, or exam excerpts here..."
                required={!selectedFile}
                className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-y"
              />
            </div>

            {/* Ingest Button */}
            <button
              type="submit"
              disabled={isProcessing || (!selectedFile && !textContent.trim())}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs shadow-xs transition flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Material...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Ingest &amp; Generate Vector Embeddings</span>
                </>
              )}
            </button>
          </form>

          {/* Live Step Progress Modal / Banner */}
          {isProcessing && (
            <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-md space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                <span className="text-xs font-bold text-slate-900">
                  Step {currentStep + 1} of {processingSteps.length}: {stepStatus}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-600 h-2 transition-all duration-500"
                  style={{ width: `${((currentStep + 1) / processingSteps.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Result Callout */}
          {successResult && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-green-900 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <span>Document Ingested &amp; Embedded Successfully!</span>
              </div>
              <p className="text-xs text-green-800 leading-relaxed">
                Created <strong>{successResult.chunksCreated} chunks</strong> with normalized 768-dimensional Gemini embeddings. Next, generate or update the topic map, then launch your diagnostic assessment.
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => router.push("/topics")}
                  className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <span>View Topic Map</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/quiz")}
                  className="px-4 py-2 rounded-xl bg-white border border-green-300 text-green-900 text-xs font-semibold hover:bg-green-100/50"
                >
                  Take Diagnostic Quiz
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Sample Material & Indexed Docs */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>1-Click Test Presets</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Load realistic course text instantly to test chunking and RAG:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleLoadSample("dsa")}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-600">
                    CS201 Data Structures
                  </div>
                  <div className="text-[10px] text-slate-400">AVL Trees &amp; Red-Black Invariants</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample("chem")}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-600">
                    CHEM301 Organic Chemistry
                  </div>
                  <div className="text-[10px] text-slate-400">SN1 vs SN2 Mechanisms</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              </button>

              <button
                type="button"
                onClick={() => handleLoadSample("econ")}
                className="w-full text-left p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/30 transition text-xs flex items-center justify-between group"
              >
                <div>
                  <div className="font-semibold text-slate-800 group-hover:text-indigo-600">
                    ECON102 Microeconomics
                  </div>
                  <div className="text-[10px] text-slate-400">Elasticity &amp; Monopoly Loss</div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">Indexed In Vector Store</span>
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                {existingDocs.length} files
              </span>
            </div>

            {existingDocs.length === 0 ? (
              <div className="text-xs text-slate-400 py-4 text-center">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {existingDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[180px]">
                        {doc.name}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          doc.type === "syllabus"
                            ? "bg-purple-100 text-purple-700"
                            : doc.type === "past_paper"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {doc.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {doc.chunkCount ? `${doc.chunkCount} vector chunks` : "Embedded & Indexed"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

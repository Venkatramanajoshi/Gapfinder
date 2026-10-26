"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Network,
  ChevronDown,
  ChevronRight,
  Layers,
  HelpCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function TopicsPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const fetchTopics = async () => {
    setErrorMsg(null);
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load topics");
      }
      if (data.topics) {
        setTopics(data.topics);
        const initialExpanded: Record<string, boolean> = {};
        data.topics.forEach((t: any) => {
          initialExpanded[t.id] = true;
        });
        setExpandedNodes(initialExpanded);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load topic hierarchy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/topics/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate topics");
      }
      await fetchTopics();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to extract topics from material");
    } finally {
      setRegenerating(false);
    }
  };

  const getStrengthDot = (category?: string) => {
    if (category === "weak") {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-100 shrink-0" title="Weak (<40%)" />
      );
    }
    if (category === "medium") {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-100 shrink-0" title="Medium (40-74%)" />
      );
    }
    if (category === "strong") {
      return (
        <span className="w-2.5 h-2.5 rounded-full bg-green-500 ring-4 ring-green-100 shrink-0" title="Strong (>=75%)" />
      );
    }
    return (
      <span className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-slate-100 shrink-0" title="Unscored" />
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
              2
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Structured Topic Map</h1>
          </div>
          <p className="text-xs text-slate-500">
            Hierarchical syllabus structure extracted and mapped to vector chunks by Gemini.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin text-indigo-600" : ""}`} />
            <span>{regenerating ? "Extracting..." : "Re-extract from Syllabus"}</span>
          </button>
          <button
            onClick={() => router.push("/quiz")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Take Diagnostic Quiz</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={handleRegenerate}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Legend Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-3 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-slate-700">Diagnostic Strength Legend:</span>
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-red-700">Weak (&lt; 40%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-amber-700">Medium (40-74%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-green-700">Strong (&ge; 75%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-slate-500">Unscored</span>
          </div>
        </div>
      </div>

      {/* Topic Tree Hierarchy */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">Reading topic hierarchy from knowledge base...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <Network className="w-12 h-12 text-indigo-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No topics mapped yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your syllabus or lecture notes, then click &ldquo;Re-extract from Syllabus&rdquo; to build your course topic tree.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/upload")}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Go to Upload
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              {regenerating ? "Extracting..." : "Generate Topics Now"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {topics.map((parent) => {
            const isExpanded = expandedNodes[parent.id] ?? true;
            const subtopics = parent.subtopics || [];

            return (
              <div
                key={parent.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-all"
              >
                {/* Parent Row */}
                <div
                  onClick={() => toggleExpand(parent.id)}
                  className="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <button className="text-slate-400 hover:text-slate-600">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {getStrengthDot(parent.category)}
                    <span className="font-bold text-slate-900 text-sm">{parent.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {parent.score !== null && parent.score !== undefined ? (
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          parent.category === "weak"
                            ? "bg-red-100 text-red-700"
                            : parent.category === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {parent.score}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Unscored</span>
                    )}
                    <span className="text-[11px] text-slate-400 hidden sm:inline-flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5" />
                      {parent.chunkCount || 0} chunks
                    </span>
                  </div>
                </div>

                {/* Subtopics List */}
                {isExpanded && subtopics.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-3 sm:px-6 space-y-2">
                    {subtopics.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-2xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 ml-2" />
                          {getStrengthDot(sub.category)}
                          <span className="text-xs font-medium text-slate-800">{sub.name}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {sub.reason && (
                            <span className="text-[10px] text-slate-500 max-w-xs truncate hidden md:block">
                              {sub.reason}
                            </span>
                          )}
                          {sub.score !== null && sub.score !== undefined ? (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                sub.category === "weak"
                                  ? "bg-red-100 text-red-700"
                                  : sub.category === "medium"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {sub.score}%
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Unscored</span>
                          )}
                          <button
                            onClick={() => router.push(`/assistant?topic=${encodeURIComponent(sub.name)}`)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition"
                            title="Ask Assistant about this subtopic"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

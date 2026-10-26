"use client";

import React, { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Calendar,
  Sparkles,
  Bot,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid,
} from "recharts";

function ReportContent() {
  const searchParams = useSearchParams();
  const attemptId = searchParams.get("attemptId");
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gaps, setGaps] = useState<any[]>([]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (attemptId) {
        const res = await fetch("/api/plan/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, daysAvailable: 5, hoursPerDay: 3 }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || "Failed to generate gap report");
        }
        setGaps(data.gaps || []);
      } else {
        const latestRes = await fetch("/api/plan/latest");
        const latestData = await latestRes.json();
        if (!latestRes.ok || latestData.error) {
          throw new Error(latestData.error || "Failed to load gap report");
        }
        if (latestData.gaps && latestData.gaps.length > 0) {
          setGaps(latestData.gaps);
        } else {
          setGaps([]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load diagnostic gap report.");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          Generating diagnostic gap analysis &amp; per-topic reasoning...
        </p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-red-200 p-8 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Unable to Load Gap Report</h2>
        <p className="text-xs text-red-700">{errorMsg}</p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={fetchReport}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => router.push("/quiz")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
          >
            Take Diagnostic Quiz
          </button>
        </div>
      </div>
    );
  }

  if (gaps.length === 0) {
    return (
      <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-indigo-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">No Diagnostic Report Yet</h2>
        <p className="text-xs text-slate-500">
          Complete a diagnostic quiz to generate your per-topic mastery breakdown and AI diagnostic reasoning.
        </p>
        <button
          onClick={() => router.push("/quiz")}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
        >
          Take Diagnostic Quiz
        </button>
      </div>
    );
  }

  const weakGaps = gaps.filter((g) => g.category === "weak");
  const mediumGaps = gaps.filter((g) => g.category === "medium");
  const strongGaps = gaps.filter((g) => g.category === "strong");

  const chartData = gaps.map((g) => ({
    name: g.topic_name.length > 20 ? g.topic_name.slice(0, 18) + "…" : g.topic_name,
    score: g.score,
    category: g.category,
  }));

  const getBarColor = (category: string) => {
    if (category === "weak") return "#ef4444";
    if (category === "medium") return "#f59e0b";
    return "#10b981";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Diagnostic Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
            <Sparkles className="w-3 h-3 text-indigo-600" /> Diagnostic Result
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Knowledge Gap Report
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
            Evaluation strictly derived from your course syllabus, lecture notes, and recent diagnostic quiz answers.
          </p>
        </div>

        {/* 3 Semantic Badges */}
        <div className="flex flex-wrap gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-700 font-bold text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{weakGaps.length} Weak</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 font-bold text-xs flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{mediumGaps.length} Medium</span>
          </div>
          <div className="px-3.5 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 font-bold text-xs flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{strongGaps.length} Strong</span>
          </div>
        </div>
      </div>

      {/* Distribution Bar Chart Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Diagnostic Score per Tested Topic</h3>
            <p className="text-[11px] text-slate-500">
              Benchmark: &lt;40% Weak &bull; 40-74% Medium &bull; &ge;75% Strong
            </p>
          </div>
        </div>

        <div className="h-56 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="name"
                stroke="#94a3b8"
                fontSize={11}
                tickLine={false}
                angle={-10}
                textAnchor="end"
              />
              <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "12px",
                  border: "none",
                }}
                formatter={(val: any) => [`${val}%`, "Diagnostic Score"]}
              />
              <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Individual Topic Cards Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Diagnostic Breakdown by Topic</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gaps.map((gap) => {
            let badgeBg = "bg-amber-100 text-amber-800 border-amber-200";
            let cardBorder = "border-amber-200 bg-white";
            let Icon = AlertTriangle;

            if (gap.category === "weak") {
              badgeBg = "bg-red-100 text-red-800 border-red-200";
              cardBorder = "border-red-200 bg-white";
              Icon = AlertCircle;
            } else if (gap.category === "strong") {
              badgeBg = "bg-green-100 text-green-800 border-green-200";
              cardBorder = "border-green-200 bg-white";
              Icon = CheckCircle2;
            }

            return (
              <div
                key={gap.topic_id}
                className={`p-5 rounded-2xl border ${cardBorder} shadow-2xs space-y-3 flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {gap.topic_name}
                    </h3>
                    <span
                      className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${badgeBg}`}
                    >
                      {gap.score}% &bull; {gap.category.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-600 leading-relaxed flex items-start gap-2">
                    <Icon className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>{gap.reason}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-100 text-xs">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {gap.category === "weak"
                      ? "High Revision Priority (60% Time)"
                      : gap.category === "medium"
                      ? "Standard Practice (30% Time)"
                      : "Light Review (10% Time)"}
                  </span>
                  <button
                    onClick={() =>
                      router.push(`/assistant?topic=${encodeURIComponent(gap.topic_name)}`)
                    }
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Revise This Topic</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary CTA: Go to Revision Plan */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-indigo-950">
            Ready to close your identified knowledge gaps?
          </h3>
          <p className="text-xs text-indigo-700/80 mt-0.5">
            Your personalized revision plan automatically allocates 60% of your available study time to weak topics.
          </p>
        </div>
        <button
          onClick={() => router.push("/plan")}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2 shrink-0"
        >
          <Calendar className="w-4 h-4" />
          <span>View Prioritized Revision Plan</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={<div className="p-10 text-center text-xs text-slate-400">Loading Report...</div>}
    >
      <ReportContent />
    </Suspense>
  );
}

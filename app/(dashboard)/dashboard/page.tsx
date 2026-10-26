"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Award,
  BookOpen,
  Calendar,
  ArrowRight,
  TrendingUp,
  Sparkles,
  AlertCircle,
  HelpCircle,
  UploadCloud,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [topicGaps, setTopicGaps] = useState<any[]>([]);
  const [latestPlan, setLatestPlan] = useState<any[] | null>(null);
  const [daysAvailable, setDaysAvailable] = useState<number>(5);
  const [hoursPerDay, setHoursPerDay] = useState<number>(3);
  const [totalTopics, setTotalTopics] = useState(0);
  const [documents, setDocuments] = useState<any[]>([]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [attRes, planRes, topRes, docRes] = await Promise.all([
        fetch("/api/attempts"),
        fetch("/api/plan/latest"),
        fetch("/api/topics"),
        fetch("/api/documents"),
      ]);

      const [attData, planData, topData, docData] = await Promise.all([
        attRes.json(),
        planRes.json(),
        topRes.json(),
        docRes.json(),
      ]);

      if (!attRes.ok || attData.error) throw new Error(attData.error || "Failed to load attempts");
      if (!planRes.ok || planData.error) throw new Error(planData.error || "Failed to load plan");
      if (!topRes.ok || topData.error) throw new Error(topData.error || "Failed to load topics");
      if (!docRes.ok || docData.error) throw new Error(docData.error || "Failed to load documents");

      setAttempts(attData.attempts || []);
      setTopicGaps(planData.gaps || []);
      setLatestPlan(planData.plan || null);
      setDaysAvailable(planData.daysAvailable ?? 5);
      setHoursPerDay(planData.hoursPerDay ?? 3);
      setTotalTopics(topData.rawCount ?? 0);
      setDocuments(docData.documents || []);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [user, loadDashboard]);

  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  const firstAttempt = attempts.length > 0 ? attempts[0] : null;
  const latestScore = latestAttempt ? Math.round(Number(latestAttempt.score)) : null;
  const scoreDelta =
    latestAttempt && firstAttempt && attempts.length > 1
      ? Math.round(Number(latestAttempt.score) - Number(firstAttempt.score))
      : null;

  const weakCount = topicGaps.filter((g) => g.category === "weak").length;
  const mediumCount = topicGaps.filter((g) => g.category === "medium").length;
  const strongCount = topicGaps.filter((g) => g.category === "strong").length;

  const chartAttempts = attempts.map((a, i) => ({
    name: `Quiz ${i + 1}`,
    score: Math.round(Number(a.score)),
    date: new Date(a.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));

  const strengthBarData = topicGaps.slice(0, 6).map((t) => ({
    name: t.topic_name.length > 18 ? t.topic_name.slice(0, 16) + "…" : t.topic_name,
    score: t.score,
    category: t.category,
  }));

  const getBarColor = (category: string) => {
    if (category === "weak") return "#ef4444";
    if (category === "medium") return "#f59e0b";
    return "#10b981";
  };

  const dayOne = latestPlan && latestPlan.length > 0 ? latestPlan[0] : null;
  const firstTask = dayOne?.tasks?.[0] || null;
  const primarySubject =
    documents.length > 0 ? documents[0].name : "No study material uploaded yet";

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadDashboard}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 mb-2">
            <Sparkles className="w-3 h-3" /> Diagnostic Engine Active
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Student Knowledge Overview
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Subject:{" "}
            <span className="font-semibold text-slate-800">{primarySubject}</span>{" "}
            &bull; {documents.length} {documents.length === 1 ? "document" : "documents"} indexed
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/upload"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Upload New
          </Link>
          <button
            onClick={() => router.push("/quiz")}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Take Diagnostic Quiz
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Latest Score */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Latest Diagnostic Score</span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {latestScore !== null ? `${latestScore}%` : "—"}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium mt-1">
              {scoreDelta !== null ? (
                <span className="flex items-center gap-1 text-green-600 font-semibold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {scoreDelta >= 0 ? `+${scoreDelta}%` : `${scoreDelta}%`} across{" "}
                    {attempts.length} attempts
                  </span>
                </span>
              ) : attempts.length === 1 ? (
                <span>1 diagnostic attempt completed</span>
              ) : (
                <span>No attempts completed yet</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Topics Covered */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Topics Analyzed</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">{totalTopics}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              {totalTopics > 0
                ? "Extracted from syllabus & lecture notes"
                : "Upload syllabus to extract topics"}
            </div>
          </div>
        </div>

        {/* Card 3: Active Gaps */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Active Knowledge Gaps</span>
            <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-red-600">
              {weakCount} {weakCount === 1 ? "Topic" : "Topics"}
            </div>
            <div className="text-[11px] text-red-600/90 font-medium mt-1">
              Scoring below 40% threshold
            </div>
          </div>
        </div>

        {/* Card 4: Exam Target */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Revision Schedule</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-extrabold text-slate-900">
              {latestPlan ? `${daysAvailable} Days` : "—"}
            </div>
            <div className="text-[11px] text-amber-700 font-medium mt-1">
              {latestPlan
                ? `${Number(hoursPerDay).toFixed(1)} hrs/day allocated on plan`
                : "Complete a quiz to build plan"}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Action Callout Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {dayOne ? (
            <>
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  Highest Priority Action
                </div>
                <h3 className="text-lg font-bold">
                  Follow Day 1 Plan: {dayOne.theme}
                </h3>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  {firstTask
                    ? `${firstTask.topic_name}: ${firstTask.activity} (${firstTask.duration_minutes} mins allocated).`
                    : "Review your prioritized revision schedule to address weak topics first."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/plan"
                  className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <span>Open Day 1 Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3 text-indigo-300" />
                  Get Started
                </div>
                <h3 className="text-lg font-bold">
                  Upload Your Course Material &amp; Take Your First Diagnostic Quiz
                </h3>
                <p className="text-xs text-indigo-200 leading-relaxed">
                  Upload your syllabus or lecture notes, extract your topic tree, and complete a grounded diagnostic quiz to generate your personalized gap report and revision plan.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/upload"
                  className="px-4 py-2.5 rounded-xl bg-white text-indigo-950 hover:bg-indigo-50 font-semibold text-xs transition shadow-xs flex items-center gap-1.5 shrink-0"
                >
                  <span>Upload Material</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Two Column Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Across Attempts */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Diagnostic Mastery Across Attempts
              </h3>
              <p className="text-[11px] text-slate-500">
                Track knowledge growth from initial diagnostic to mastery
              </p>
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {attempts.length} {attempts.length === 1 ? "Attempt" : "Attempts"}
            </span>
          </div>
          <div className="h-64 mt-4 flex items-center justify-center">
            {chartAttempts.length === 0 ? (
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No quiz attempts recorded yet.
                </p>
                <Link
                  href="/quiz"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <span>Take your first diagnostic quiz</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartAttempts}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                    formatter={(val: any) => [`${val}%`, "Score"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#4f46e5", stroke: "#ffffff", strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Topic Strength Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Current Topic Strength Breakdown
              </h3>
              <p className="text-[11px] text-slate-500">
                Red = Weak (&lt;40%), Amber = Medium (40-74%), Green = Strong (&ge;75%)
              </p>
            </div>
            <div className="flex gap-1 text-[10px] font-bold">
              <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{weakCount} W</span>
              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                {mediumCount} M
              </span>
              <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                {strongCount} S
              </span>
            </div>
          </div>
          <div className="h-64 mt-4 flex items-center justify-center">
            {strengthBarData.length === 0 ? (
              <div className="text-center space-y-2">
                <p className="text-xs text-slate-400">
                  No topic scores available yet.
                </p>
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <span>Upload material &amp; take a quiz</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={strengthBarData}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    width={130}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "12px",
                      border: "none",
                    }}
                    formatter={(val: any) => [`${val}%`, "Mastery"]}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                    {strengthBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.category)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/topics"
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Explore Topic Map
            </div>
            <div className="text-[11px] text-slate-500">Interactive collapsible hierarchy</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/report"
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              View Detailed Gap Report
            </div>
            <div className="text-[11px] text-slate-500">Specific diagnostic reasoning</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/assistant"
          className="bg-white hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all group flex items-center justify-between"
        >
          <div>
            <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Explain-This-Topic Assistant
            </div>
            <div className="text-[11px] text-slate-500">Grounded with section citations</div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
        </Link>
      </div>
    </div>
  );
}

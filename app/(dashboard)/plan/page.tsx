"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Clock,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import confetti from "canvas-confetti";

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [days, setDays] = useState(5);
  const [hours, setHours] = useState(3);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/plan/latest");
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load revision plan");
      }
      if (data.plan && data.plan.length > 0) {
        setPlan(data.plan);
        if (data.daysAvailable) setDays(data.daysAvailable);
        if (data.hoursPerDay) setHours(data.hoursPerDay);
      } else {
        setPlan([]);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load revision plan.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysAvailable: days, hoursPerDay: hours }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate revision plan");
      }
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to regenerate revision plan.");
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const updated = { ...prev, [taskId]: !prev[taskId] };
      if (updated[taskId]) {
        confetti({
          particleCount: 15,
          spread: 40,
          origin: { y: 0.8 },
        });
      }
      return updated;
    });
  };

  const totalTasksCount = plan.reduce((acc, day) => acc + (day.tasks?.length || 0), 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct =
    totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header with Inputs & Regenerate */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-1">
            <Sparkles className="w-3 h-3 text-indigo-600" /> Automated Schedule
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Prioritized Revision Plan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Weak areas receive 60% of total revision hours, medium 30%, strong 10%.
          </p>
        </div>

        {/* Inputs & CTA */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>Days Left:</span>
            <input
              type="number"
              min={1}
              max={30}
              value={days}
              onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span>Hrs/Day:</span>
            <input
              type="number"
              min={1}
              max={12}
              value={hours}
              onChange={(e) => setHours(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-12 bg-white border border-slate-200 rounded-lg p-1 text-center font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? "animate-spin" : ""}`} />
            <span>{regenerating ? "Regenerating..." : "Regenerate Plan"}</span>
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

      {/* Progress Tracker Card */}
      <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 w-full sm:w-auto">
          <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <span>
              Revision Completion: {completedCount} of {totalTasksCount} tasks checked
            </span>
            <span className="text-indigo-600 font-extrabold">{progressPct}%</span>
          </div>
          <div className="w-full sm:w-80 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-2 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-500" /> 60% Weak
          </span>
          <span className="inline-flex items-center gap-1 text-amber-600">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> 30% Medium
          </span>
          <span className="inline-flex items-center gap-1 text-green-600">
            <span className="w-2 h-2 rounded-full bg-green-500" /> 10% Strong
          </span>
        </div>
      </div>

      {/* Loading or Empty or Schedule */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="text-xs text-slate-500">
            Building customized day-by-day revision schedule...
          </p>
        </div>
      ) : plan.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <HelpCircle className="w-10 h-10 text-indigo-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Revision Plan Generated Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Complete a diagnostic quiz first so GapFinder AI can prioritize your weak topics, or click &ldquo;Regenerate Plan&rdquo; if you already have quiz results.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/quiz")}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              Take Diagnostic Quiz
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              {regenerating ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {plan.map((dayItem: any) => (
            <div
              key={dayItem.day}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
            >
              {/* Day Header */}
              <div className="bg-slate-50/70 px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                    D{dayItem.day}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{dayItem.theme}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{dayItem.allocated_hours} Hours Allocated</span>
                </div>
              </div>

              {/* Tasks List */}
              <div className="p-4 sm:p-6 space-y-3">
                {dayItem.tasks?.map((task: any, idx: number) => {
                  const taskId = `task-${dayItem.day}-${idx}`;
                  const isDone = completedTasks[taskId] || false;
                  const isWeak = task.category === "weak";
                  const isMed = task.category === "medium";

                  let cardBorder = "border-slate-100 bg-white hover:bg-slate-50/50";
                  if (isWeak) {
                    cardBorder = "border-red-200 bg-red-50/20";
                  } else if (isMed) {
                    cardBorder = "border-amber-100 bg-amber-50/10";
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(taskId)}
                      className={`p-3.5 rounded-xl border ${cardBorder} flex items-start justify-between gap-4 cursor-pointer transition-all select-none ${
                        isDone ? "opacity-60 bg-slate-50" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-all ${
                            isDone
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white hover:border-indigo-400"
                          }`}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                        <div>
                          <div
                            className={`text-xs font-bold text-slate-900 ${
                              isDone ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.topic_name}
                          </div>
                          <p
                            className={`text-xs text-slate-600 mt-0.5 leading-relaxed ${
                              isDone ? "line-through text-slate-400" : ""
                            }`}
                          >
                            {task.activity}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono font-medium text-slate-400">
                          {task.duration_minutes}m
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isWeak
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : isMed
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-green-100 text-green-700 border border-green-200"
                          }`}
                        >
                          {task.category?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

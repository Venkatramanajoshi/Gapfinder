"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  BookOpen,
  Loader2,
  HelpCircle,
  Quote,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

export default function QuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showCitationDetails, setShowCitationDetails] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initQuiz = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/quiz/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || "Failed to generate diagnostic quiz.");
        setQuestions([]);
      } else if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setAttemptId(data.attemptId);
        setCurrentIndex(0);
        setSelectedOption(null);
        setEvaluation(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to generate diagnostic quiz.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initQuiz();
  }, []);

  const handleOptionSelect = async (opt: string) => {
    if (evaluation || evaluating || !attemptId) return;
    setSelectedOption(opt);
    setEvaluating(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/quiz/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: questions[currentIndex].id,
          userAnswer: opt,
          attemptId,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to evaluate answer");
      }
      setEvaluation(data);
      if (data.isCorrect) {
        confetti({
          particleCount: 25,
          spread: 60,
          origin: { y: 0.8 },
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Error evaluating answer.");
      setSelectedOption(null);
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    setEvaluation(null);
    setSelectedOption(null);
    setShowCitationDetails(false);

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
      router.push(`/report?attemptId=${attemptId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 animate-pulse">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="font-bold text-slate-800 text-sm">
            Retrieving context and preparing diagnostic questions...
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            Strictly querying your uploaded syllabus and lecture chunks. Outside knowledge is prohibited.
          </p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto space-y-4">
        <HelpCircle className="w-12 h-12 text-indigo-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">
          {errorMsg || "Upload material and generate topics first"}
        </h2>
        <p className="text-xs text-slate-500">
          Upload your course syllabus or notes and generate your topic hierarchy to take a grounded diagnostic quiz.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => router.push("/upload")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
          >
            Upload Material
          </button>
          <button
            onClick={() => router.push("/topics")}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            Generate Topics
          </button>
          <button
            onClick={initQuiz}
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-red-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={initQuiz}
            className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Top Header & Progress */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
              3
            </span>
            <span>
              Diagnostic Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
          <span>{Math.round(progressPercent)}% Completed</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-indigo-600 h-2 transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            Testing: {currentQ.topic_name || "Course Subject Invariant"}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <BookOpen className="w-3 h-3" />
            100% Grounded in Your Text
          </span>
        </div>

        <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed">
          {currentQ.question}
        </h2>

        {/* Big Option Buttons */}
        <div className="space-y-3">
          {currentQ.options.map((opt: string, idx: number) => {
            const isSelected = selectedOption === opt;
            let buttonStyles =
              "border-slate-200 hover:border-indigo-400 bg-white hover:bg-slate-50/50 text-slate-800";

            if (evaluation) {
              if (opt.trim().toLowerCase() === evaluation.correctAnswer.trim().toLowerCase()) {
                buttonStyles =
                  "border-green-500 bg-green-50/70 text-green-950 font-semibold ring-2 ring-green-500/20";
              } else if (isSelected && !evaluation.isCorrect) {
                buttonStyles =
                  "border-red-500 bg-red-50/70 text-red-950 ring-2 ring-red-500/20";
              } else {
                buttonStyles = "border-slate-200 opacity-60 bg-white";
              }
            } else if (isSelected) {
              buttonStyles = "border-indigo-600 bg-indigo-50/40 text-indigo-950 font-semibold";
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={Boolean(evaluation) || evaluating}
                onClick={() => handleOptionSelect(opt)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between text-xs sm:text-sm font-medium ${buttonStyles}`}
              >
                <div className="flex items-center gap-3 pr-2">
                  <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center shrink-0">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>

                {evaluation &&
                  opt.trim().toLowerCase() === evaluation.correctAnswer.trim().toLowerCase() && (
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  )}
                {evaluation && isSelected && !evaluation.isCorrect && (
                  <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Evaluating Spinner */}
      {evaluating && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Verifying answer against vector source chunks...</span>
        </div>
      )}

      {/* Instant Feedback Panel */}
      {evaluation && (
        <div
          className={`p-6 rounded-2xl border shadow-sm space-y-4 transition-all ${
            evaluation.isCorrect
              ? "bg-green-50/50 border-green-200"
              : "bg-red-50/50 border-red-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full ${
                  evaluation.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                }`}
              >
                {evaluation.isCorrect ? "Correct Diagnosis" : "Knowledge Gap Identified"}
              </span>
              <span className="text-xs text-slate-600 font-medium">
                {evaluation.sourceCitation}
              </span>
            </div>

            <button
              onClick={() => setShowCitationDetails(!showCitationDetails)}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-slate-200"
            >
              <Quote className="w-3.5 h-3.5 text-indigo-600" />
              <span>{showCitationDetails ? "Hide Source Excerpt" : "View Source Chunk"}</span>
              {showCitationDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-normal">
            {evaluation.explanation}
          </p>

          {/* Expandable Source Chunk Excerpt */}
          {showCitationDetails && (
            <div className="bg-white rounded-xl p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                Verified Source Material
              </div>
              <blockquote className="italic border-l-2 border-indigo-500 pl-3 text-slate-600">
                &ldquo;{evaluation.citationQuote}&rdquo;
              </blockquote>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={handleNext}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2"
            >
              <span>
                {currentIndex + 1 === questions.length ? "View Gap Report" : "Next Question"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

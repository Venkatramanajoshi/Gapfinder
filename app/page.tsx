"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  HelpCircle,
  CalendarCheck,
  Database,
} from "lucide-react";

export default function LandingPage() {
  const { loginAsDemo, user } = useAuth();
  const router = useRouter();

  const handleTryDemo = async () => {
    const res = await loginAsDemo();
    if (res.error) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
              GF
            </div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight">
              GapFinder AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/schema"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <Database className="w-3.5 h-3.5" />
              <span>SQL Schema &amp; Vercel</span>
            </Link>

            {user ? (
              <Link
                href="/dashboard"
                className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-xs font-semibold text-slate-700 hover:text-indigo-600 px-3 py-2 transition"
                >
                  Log In
                </Link>
                <button
                  onClick={handleTryDemo}
                  className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Demo</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 max-w-5xl mx-auto text-center flex-1">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Grounded Academic Diagnostics</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-tight">
          Find what you{" "}
          <span className="text-indigo-600 underline decoration-indigo-200">
            don&apos;t know
          </span>
          .
        </h1>

        <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Upload your syllabus, lecture notes, or past exams. GapFinder AI extracts topics, generates a diagnostic quiz strictly grounded in your material with source citations, reveals your exact knowledge gaps, and compiles an automated day-by-day revision schedule.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={handleTryDemo}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Try the Demo Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-semibold text-sm shadow-xs transition-all flex items-center justify-center"
          >
            Custom Sign In / Upload
          </Link>
        </div>

        {/* Demo Credentials Pill */}
        <div className="mt-4 text-xs text-slate-500 font-medium flex items-center justify-center gap-2">
          <span>Pre-seeded demo user:</span>
          <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-200">
            demo@gapfinder.app
          </code>
          <span>/</span>
          <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-200">
            Demo@1234
          </code>
        </div>

        {/* Interactive Feature Pipeline Card */}
        <div className="mt-14 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden text-left p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-center justify-between pb-6 border-b border-slate-100 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                End-to-End RAG Architecture
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                From Raw Notes to Personalized Mastery
              </h3>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200">
                Weak &lt; 40% (60% Time)
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                Medium 40-74% (30% Time)
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 border border-green-200">
                Strong &ge; 75% (10% Light)
              </span>
            </div>
          </div>

          {/* 3 Step Diagram */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                01
              </div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Ingest &amp; Chunking
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Parses syllabus, lecture notes &amp; past papers. Splits into 350-word chunks with 40-word overlap, preserves section headers and page references.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                02
              </div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Grounded Diagnostic
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Retrieves closest vector chunks per topic. Generates MCQs with mandatory source citations and quote snippets. Zero outside knowledge allowed.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                03
              </div>
              <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4 text-indigo-600" />
                Prioritized Revision Plan
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Computes topic strengths, generates a Gap Report with diagnostic reasons, and schedules your revision allocating 60% of hours directly to weak areas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>GapFinder AI &bull; Powered by Gemini &amp; Vector RAG</div>
          <div className="flex gap-4">
            <Link href="/schema" className="text-indigo-600 hover:underline font-medium">
              Supabase SQL &amp; Vercel Guide
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

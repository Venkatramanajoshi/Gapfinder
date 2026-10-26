"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Lock, Mail, Sparkles } from "lucide-react";

export default function SignupPage() {
  const { signup, loginAsDemo } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await signup(email, password);
      if (res.error) {
        setErrorMessage(res.error);
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 font-black text-slate-900 text-xl">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-base shadow-sm">
              GF
            </div>
            <span>GapFinder AI</span>
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Create Your Study Profile</h2>
          <p className="text-xs text-slate-500">Find your weak topics and master your exams with grounded RAG</p>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="student@university.edu"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? "Creating Profile..." : "Sign Up & Get Started"}
            </button>
          </form>

          <div className="pt-2 text-center text-xs text-slate-500 border-t border-slate-100 flex items-center justify-between">
            <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
              Already have an account? Sign in
            </Link>
            <button
              onClick={async () => {
                await loginAsDemo();
                router.push("/dashboard");
              }}
              className="text-xs text-slate-600 hover:text-indigo-600 font-medium inline-flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3 text-indigo-500" /> Use Demo Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

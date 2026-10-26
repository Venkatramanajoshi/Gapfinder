"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  BookOpen,
  Bot,
  User,
  Sparkles,
  Loader2,
  HelpCircle,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: {
    section: string;
    page: number;
    snippet: string;
  }[];
}

function AssistantContent() {
  const searchParams = useSearchParams();
  const prefilledTopic = searchParams.get("topic");

  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I am your Explain-This-Topic assistant. I answer questions grounded solely in your uploaded syllabus, lecture notes, and exam papers. If a concept is not in your materials, I will explicitly let you know.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (prefilledTopic) {
      handleSend(`Can you explain "${prefilledTopic}" in detail based on my course notes?`);
    }
  }, [prefilledTopic]);

  const handleSend = async (textToSend?: string) => {
    const question = (textToSend || query).trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    if (!textToSend) setQuery("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: question }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No response generated.",
          citations: data.citations || [],
        },
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Encountered an issue communicating with the grounding service. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const starterQuestions = [
    "What is the difference between BFS and DFS?",
    "Explain AVL tree rotations and balance factor",
    "How does Memoization differ from Tabulation in DP?",
    "What is linear probing in hash tables?",
  ];

  return (
    <div className="max-w-4xl mx-auto h-[82vh] flex flex-col space-y-4">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-1">
            <Sparkles className="w-3 h-3 text-indigo-600" /> Grounded Academic Mentor
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Explain-This-Topic</h1>
          <p className="text-xs text-slate-500">
            Answers are strictly cited and drawn only from your uploaded materials.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <BookOpen className="w-3.5 h-3.5" />
            Zero Outside Hallucinations
          </span>
        </div>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs overflow-y-auto space-y-4">
        {messages.length === 1 && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center space-y-3 my-4">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="text-xs font-bold text-slate-800">
              Try asking about your CS201 Data Structures notes:
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {starterQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-xs font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 px-3 py-1.5 rounded-xl transition shadow-2xs text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? "bg-slate-900 text-white"
                    : "bg-indigo-600 text-white shadow-xs"
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`space-y-2 max-w-[85%] sm:max-w-[78%] ${isUser ? "text-right" : "text-left"}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? "bg-indigo-600 text-white font-medium rounded-tr-xs"
                      : "bg-slate-100/90 text-slate-900 rounded-tl-xs whitespace-pre-wrap"
                  }`}
                >
                  {m.content}
                </div>

                {m.citations && m.citations.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {m.citations.map((c, cIdx) => (
                      <div
                        key={cIdx}
                        className="inline-flex items-center gap-1.5 text-[11px] bg-indigo-50/90 border border-indigo-200 text-indigo-800 px-2.5 py-1 rounded-lg"
                        title={c.snippet}
                      >
                        <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="font-semibold">{c.section}</span>
                        <span className="text-indigo-400">&bull;</span>
                        <span className="text-indigo-600">p.{c.page}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-100 p-4 rounded-2xl rounded-tl-xs text-xs text-slate-600 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Querying vector chunks and synthesizing grounded answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-2 shadow-xs flex items-center gap-2">
        <input
          type="text"
          value={query}
          disabled={loading}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask a question about your uploaded course material..."
          className="flex-1 px-4 py-2 text-xs sm:text-sm bg-transparent focus:outline-none text-slate-900 placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => handleSend()}
          disabled={loading || !query.trim()}
          className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition shadow-xs flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-slate-400">Loading Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}

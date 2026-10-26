"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import {
  LayoutDashboard,
  UploadCloud,
  Network,
  HelpCircle,
  FileSpreadsheet,
  CalendarCheck,
  Bot,
  Database,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
  BookOpen,
} from "lucide-react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Upload Material", href: "/upload", icon: UploadCloud },
    { name: "Topic Map", href: "/topics", icon: Network },
    { name: "Diagnostic Quiz", href: "/quiz", icon: HelpCircle, highlight: true },
    { name: "Gap Report", href: "/report", icon: FileSpreadsheet },
    { name: "Revision Plan", href: "/plan", icon: CalendarCheck },
    { name: "Explain Assistant", href: "/assistant", icon: Bot },
    { name: "SQL & Deploy", href: "/schema", icon: Database },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-30">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-slate-900">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm font-black text-sm">
            GF
          </div>
          <span>GapFinder AI</span>
        </Link>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs flex flex-col">
          <div className="bg-white w-4/5 max-w-sm h-full p-4 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-sm">
                    GF
                  </div>
                  <span>GapFinder AI</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-indigo-50 text-indigo-700 font-semibold"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? "text-indigo-600" : "text-slate-400"}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500 mb-2 truncate">Signed in: {user?.email}</div>
              <button
                onClick={async () => {
                  await logout();
                  setMobileMenuOpen(false);
                  router.push("/login");
                }}
                className="flex items-center gap-2 text-sm text-red-600 font-medium p-2 hover:bg-red-50 rounded-lg w-full"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white sticky top-0 h-screen select-none">
        {/* Brand */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm font-black text-base tracking-tight">
              GF
            </div>
            <div>
              <div className="font-bold text-slate-900 text-base leading-tight">GapFinder AI</div>
              <div className="text-[11px] text-slate-400 font-medium">Diagnostic Study App</div>
            </div>
          </Link>
        </div>

        {/* Course Context Pill */}
        <div className="px-4 pt-4 pb-2">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 text-xs">
            <div className="text-indigo-500 font-semibold text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Knowledge Workspace
            </div>
            <div className="font-semibold text-indigo-950 truncate">
              {user?.email || "Study Session"}
            </div>
            <div className="text-[11px] text-indigo-600/80 mt-0.5">768-dim Vector RAG Active</div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? "text-white" : "text-slate-400 group-hover:text-indigo-600"
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                    Start
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer info & user logout */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between">
            <div className="truncate mr-2">
              <div className="text-[11px] font-medium text-slate-900 truncate">
                {user?.email || "Not signed in"}
              </div>
              <div className="text-[10px] text-slate-400">Authenticated Session</div>
            </div>
            <button
              onClick={async () => {
                await logout();
                router.push("/login");
              }}
              title="Sign Out"
              className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-slate-100 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Top bar on desktop */}
        <header className="hidden md:flex items-center justify-between bg-white border-b border-slate-200 px-8 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
              Grounded RAG &bull; Source Citations
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/quiz"
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Take Diagnostic Quiz
            </Link>
          </div>
        </header>

        {/* Page Inner Container */}
        <div className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto">{children}</div>
      </main>
    </div>
  );
}

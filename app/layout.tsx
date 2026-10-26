import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GapFinder AI - Find What You Don't Know",
  description:
    "AI-powered diagnostic study app that finds your weak topics, generates grounded quizzes with citations, and builds prioritized revision plans.",
  openGraph: {
    title: "GapFinder AI - Find What You Don't Know",
    description:
      "AI-powered diagnostic study app that finds your weak topics, generates grounded quizzes with citations, and builds prioritized revision plans.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-indigo-500 selection:text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

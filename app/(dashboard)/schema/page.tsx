"use client";

import React, { useState } from "react";
import { Copy, Check, Database, Terminal } from "lucide-react";

export default function SchemaPage() {
  const [copied, setCopied] = useState(false);

  const supabaseSQL = `-- =========================================================
-- GapFinder AI Database Schema (PostgreSQL + pgvector + RLS)
-- =========================================================

-- Enable Vector Extension (pgvector for 768-dim Google Gemini embeddings)
create extension if not exists vector;

-- Profiles Table linked to Supabase Auth
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  created_at timestamptz default now()
);

-- Documents Table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  type text check (type in ('syllabus', 'notes', 'past_paper')) not null,
  created_at timestamptz default now()
);

-- Topics Table (Academic hierarchy)
create table if not exists public.topics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  parent_id uuid references public.topics(id) on delete cascade,
  created_at timestamptz default now()
);

-- Chunks Table with 768-dim Vector for Gemini Embeddings
create table if not exists public.chunks (
  id uuid default gen_random_uuid() primary key,
  document_id uuid references public.documents(id) on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  content text not null,
  section_label text,
  page int default 1,
  topic_id uuid references public.topics(id) on delete set null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- Quiz Attempts Table
create table if not exists public.quiz_attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  score numeric(5,2) not null default 0.00,
  created_at timestamptz default now()
);

-- Quiz Questions Table
create table if not exists public.quiz_questions (
  id uuid default gen_random_uuid() primary key,
  attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  source_chunk_id uuid references public.chunks(id) on delete set null,
  user_answer text,
  is_correct boolean,
  explanation text,
  citation_quote text,
  created_at timestamptz default now()
);

-- Topic Scores Table (Weak < 40%, Medium 40-74%, Strong >= 75%)
create table if not exists public.topic_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic_id uuid references public.topics(id) on delete cascade not null,
  attempt_id uuid references public.quiz_attempts(id) on delete cascade not null,
  score numeric(5,2) not null,
  reason text,
  created_at timestamptz default now()
);

-- Revision Plans Table
create table if not exists public.revision_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  days_available int not null,
  hours_per_day numeric(4,2) not null,
  plan_json jsonb not null,
  created_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.documents enable row level security;
alter table public.topics enable row level security;
alter table public.chunks enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.topic_scores enable row level security;
alter table public.revision_plans enable row level security;

-- Setup RLS Policies (Users only see and manage their own records)
drop policy if exists "Users own profiles" on public.profiles;
create policy "Users own profiles" on public.profiles for all using (auth.uid() = id);

drop policy if exists "Users own documents" on public.documents;
create policy "Users own documents" on public.documents for all using (auth.uid() = user_id);

drop policy if exists "Users own topics" on public.topics;
create policy "Users own topics" on public.topics for all using (auth.uid() = user_id);

drop policy if exists "Users own chunks" on public.chunks;
create policy "Users own chunks" on public.chunks for all using (auth.uid() = user_id);

drop policy if exists "Users own quiz_attempts" on public.quiz_attempts;
create policy "Users own quiz_attempts" on public.quiz_attempts for all using (auth.uid() = user_id);

drop policy if exists "Users own quiz_questions" on public.quiz_questions;
create policy "Users own quiz_questions" on public.quiz_questions for all using (
  exists (
    select 1 from public.quiz_attempts
    where quiz_attempts.id = quiz_questions.attempt_id
      and quiz_attempts.user_id = auth.uid()
  )
);

drop policy if exists "Users own topic_scores" on public.topic_scores;
create policy "Users own topic_scores" on public.topic_scores for all using (auth.uid() = user_id);

drop policy if exists "Users own revision_plans" on public.revision_plans;
create policy "Users own revision_plans" on public.revision_plans for all using (auth.uid() = user_id);

-- Match Chunks Cosine Similarity Search Function
create or replace function match_chunks (
  query_embedding vector(768),
  match_count int,
  filter_user_id uuid
) returns table (
  id uuid,
  document_id uuid,
  content text,
  section_label text,
  page int,
  topic_id uuid,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    chunks.id,
    chunks.document_id,
    chunks.content,
    chunks.section_label,
    chunks.page,
    chunks.topic_id,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.user_id = filter_user_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- Trigger to automate profile row creation on Auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();`;

  const handleCopy = () => {
    navigator.clipboard.writeText(supabaseSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 mb-1">
            <Database className="w-3 h-3 text-indigo-600" /> Supabase &amp; pgvector Schema
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Database Migration &amp; Vercel Deployment
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Full production PostgreSQL script with 768-dim vector embeddings, Row Level Security, and cosine similarity search function.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied SQL to Clipboard!" : "Copy SQL Script"}</span>
        </button>
      </div>

      {/* Deployment Quick Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <div className="text-xs font-bold text-slate-900">Run in Supabase SQL Editor</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Paste this SQL script in your Supabase dashboard to enable pgvector, tables, RLS policies, and match_chunks function.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
            2
          </div>
          <div className="text-xs font-bold text-slate-900">Configure Environment Keys</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, and GEMINI_API_KEY in Vercel Project Settings.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
          <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
            3
          </div>
          <div className="text-xs font-bold text-slate-900">Deploy to Vercel</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Connect repository to Vercel. Route handlers execute server-side RAG retrieval and Gemini generation.
          </p>
        </div>
      </div>

      {/* SQL Code Block */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-mono">supabase/schema.sql (Postgres + pgvector + RLS)</span>
          </div>
          <button
            onClick={handleCopy}
            className="hover:text-white flex items-center gap-1 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
        <pre className="p-5 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed max-h-[500px]">
          <code>{supabaseSQL}</code>
        </pre>
      </div>
    </div>
  );
}

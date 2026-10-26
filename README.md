# GapFinder AI — Diagnostic Study App

**Find what you don't know.**

GapFinder AI is a full-stack diagnostic study application built with Next.js 14 (App Router), TypeScript, Supabase (`pgvector` + Row Level Security), and Google Gemini. Instead of offering generic chat responses, it ingests a student's real course materials (syllabi, lecture notes, and past exam papers), extracts a hierarchical topic tree, generates multiple-choice diagnostic quizzes grounded strictly in their material with verifiable source citations, diagnoses per-topic knowledge gaps, and builds a prioritized day-by-day revision schedule.

---

## 1. Architecture Diagram & RAG Pipeline

```text
[Student Course Upload: Syllabus / Notes / Past Paper (.pdf, .txt, .md)]
                                 │
                                 ▼
[Structural Chunker: ~350 words, 40-word overlap, section_label & page extraction]
                                 │
                                 ▼
[Google Gemini Embeddings: GEMINI_EMBED_MODEL (outputDimensionality: 768, L2-normalized)]
                                 │
                                 ▼
[PostgreSQL + pgvector (vector(768)) with Row Level Security (RLS)]
                 │                                       │
                 ▼                                       ▼
     [Topic Tree Extraction]                 [Diagnostic Quiz Generation]
   (Zod-validated TopicTreeSchema)        (Leaf topics -> match_chunks top-3)
                 │                                       │
                 ▼                                       ▼
   [Batch Topic Embedding &               [Single Gemini Call + Citation Check]
    Cosine Chunk Assignment]             (Verifies citation_quote in source_chunk)
                                                         │
                                                         ▼
                                               [Answer Evaluation]
                                         (Reveals correct_answer & citation)
                                                         │
                                                         ▼
                                              [Gap Analysis Report]
                                     (Weak <40%, Medium 40-74%, Strong >=75%
                                      + AI one-line diagnosis from mistakes)
                                                         │
                                                         ▼
                                            [Prioritized Revision Plan]
                                    (60% Weak, 30% Medium, 10% Strong allocation)
```

### RAG Pipeline Mechanics
1. **Ingest & Structural Chunking (`/api/ingest`)**: Extracts text from uploaded PDFs (`pdf-parse`), `.txt`, or `.md` files and splits it into ~350-word chunks with a 40-word sliding window overlap while preserving `section_label` and `page` metadata.
2. **Normalized 768-dim Embeddings (`lib/ai/gemini.ts`)**: Embeds chunks in batches using `GEMINI_EMBED_MODEL` (`gemini-embedding-2-preview`) with `outputDimensionality: 768` and L2 unit normalization, stored in `chunks.embedding vector(768)`.
3. **Topic Tree Extraction & Assignment (`/api/topics/generate`)**: Deletes previous topics for the user to prevent duplicates, parses syllabus/course chunks with Gemini + `TopicTreeSchema` (with 1 automatic retry), embeds each topic name once in batch, and assigns every user chunk to its closest leaf topic by cosine similarity.
4. **Vector Retrieval & Grounded Quiz Generation (`/api/quiz/generate`)**:
   - Selects up to 6 leaf sub-topics round-robin across parent topics.
   - Batch-embeds topic names and calls `match_chunks(query_embedding, match_count: 3, filter_user_id: user.id)` so retrieval strictly queries only the logged-in user's chunks.
   - Sends retrieved chunks in a single Gemini call (`15s` timeout) with the rule: *"Use only the provided context. If the context is insufficient, skip the topic. Do not use outside knowledge."*
   - **Citation Verification**: Validates the response with `QuizQuestionsSchema` and verifies in code that `source_chunk_id` is in the retrieved set and `citation_quote` appears verbatim inside that chunk. Retries once for any missing topics.
   - Never sends `correct_answer` to the browser during quiz generation; `/api/quiz/evaluate` returns the correct answer, explanation, and verified quote after the student answers.
5. **Explain-This-Topic Assistant (`/api/assistant`)**: Queries `match_chunks` first and enforces a cosine similarity threshold (`0.35`). If no chunk meets the threshold or the context does not answer the question, it replies strictly: *"Not found in your material."*

---

## 2. Try the Demo

The application includes a pre-seeded demo account for **CS201 Data Structures & Algorithms**:
- **Email**: `demo@gapfinder.app`
- **Password**: `Demo@1234`
- Click **"Try the Demo Account"** on the landing page or **"Instant 1-Click Login"** on `/login` to sign in and explore the pre-seeded documents, topic hierarchy, quiz attempts, gap report, and revision plan.

---

## 3. Local Setup Steps

1. **Create a Supabase Project & Run Schema**:
   - Create a new project at [supabase.com](https://supabase.com).
   - Open the **SQL Editor** and run the full contents of [`supabase/schema.sql`](./supabase/schema.sql) to enable `pgvector`, create all tables, configure Row Level Security (RLS) policies, and create the `match_chunks` RPC function.
   - To allow instant sign-ups without email verification links, go to **Supabase Dashboard → Authentication → Providers → Email** and toggle off **"Confirm email"**.

2. **Configure Environment Variables (`.env.local`)**:
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi..."
   SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."

   GEMINI_API_KEY="AIzaSy..."
   GEMINI_MODEL="gemini-3-flash-preview"
   GEMINI_EMBED_MODEL="gemini-embedding-2-preview"
   ```
   > **How to check if `GEMINI_MODEL` and `GEMINI_EMBED_MODEL` are valid for your API key**:
   > Run a quick check in your terminal:
   > ```bash
   > curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY" | grep -E '"name":.*(gemini-3-flash|gemini-embedding)'
   > ```
   > Or run `npm run seed`, which exercises `GEMINI_EMBED_MODEL` directly.

3. **Install Dependencies, Seed Demo Data, and Start Dev Server**:
   ```bash
   npm install
   npm run seed
   npm run dev
   ```
   Open `http://localhost:3000`.

---

## 4. Vercel Deployment Steps

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Import the project into [Vercel](https://vercel.com/new).
3. In **Vercel Project Settings → Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (`gemini-3-flash-preview`)
   - `GEMINI_EMBED_MODEL` (`gemini-embedding-2-preview`)
4. Click **Deploy**. Next.js App Router API routes (`/api/*`) run server-side and keep `GEMINI_API_KEY` private.

---

## 5. AI Workflow & Revision Plan Prioritization Rules

- **Per-Topic Mastery Scoring**:
  - **Weak (`< 40%`)**: Receives **60%** of total available revision hours. Focuses on foundational invariants, manual tracing, and core definitions.
  - **Medium (`40% – 74%`)**: Receives **30%** of study time. Focuses on boundary conditions and edge-case drills.
  - **Strong (`>= 75%`)**: Receives **10%** of study time for rapid recall and retention.
- **Automated Regeneration**: Every completed diagnostic quiz attempt computes updated `topic_scores`, generates one-line diagnostic reasons from actual student mistakes and source chunks, and saves a fresh revision schedule into `revision_plans`.

---

## 6. Limitations & Future Work

- **Handwritten Diagrams & OCR**: Currently extracts text from digital PDFs (`pdf-parse`), `.txt`, and `.md` files. Future versions will use multimodal vision to parse handwritten equations and diagrams in scanned notes.
- **Spaced Repetition & Calendar Export**: Exporting daily revision tasks directly to Google Calendar or `.ics` / Anki decks.
- **Cohort Analytics**: Aggregated anonymised gap reports for instructors to see which syllabus topics an entire class is struggling with.

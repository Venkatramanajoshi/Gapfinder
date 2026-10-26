import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import {
  generateBatchEmbeddings,
  generateStructuredTextWithTimeout,
} from "@/lib/ai/gemini";
import { QuizQuestionsSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: allTopics, error: topicErr } = await supabase
      .from("topics")
      .select("id, name, parent_id")
      .eq("user_id", user.id);

    if (topicErr) throw topicErr;

    const { count: chunkCount, error: chunkCountErr } = await supabase
      .from("chunks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (chunkCountErr) throw chunkCountErr;

    if (!allTopics || allTopics.length === 0 || !chunkCount || chunkCount === 0) {
      return NextResponse.json(
        { error: "Upload material and generate topics first" },
        { status: 400 }
      );
    }

    // 1. Get user's leaf topics (sub-topics), cover up to 6 round-robin across parents
    const parentIds = new Set(allTopics.filter((t) => t.parent_id).map((t) => t.parent_id));
    const leafTopics = allTopics.filter((t) => t.parent_id !== null || !parentIds.has(t.id));

    const byParent: Record<string, typeof leafTopics> = {};
    for (const leaf of leafTopics) {
      const key = leaf.parent_id || leaf.id;
      if (!byParent[key]) byParent[key] = [];
      byParent[key].push(leaf);
    }

    const selectedTopics: typeof leafTopics = [];
    const parentKeys = Object.keys(byParent);
    let round = 0;
    while (selectedTopics.length < 6) {
      let addedInRound = false;
      for (const pk of parentKeys) {
        if (selectedTopics.length >= 6) break;
        const item = byParent[pk][round];
        if (item) {
          selectedTopics.push(item);
          addedInRound = true;
        }
      }
      if (!addedInRound) break;
      round++;
    }

    // 2. Embed each selected topic name in batch, then call match_chunks RPC (top 3 per topic)
    const topicEmbeddings = await generateBatchEmbeddings(
      selectedTopics.map((t) => t.name),
      6
    );

    const topicContexts: {
      topic: { id: string; name: string };
      chunks: { id: string; content: string; section_label: string }[];
    }[] = [];

    for (let i = 0; i < selectedTopics.length; i++) {
      const topic = selectedTopics[i];
      const emb = topicEmbeddings[i];
      const { data: matched, error: rpcErr } = await supabase.rpc("match_chunks", {
        query_embedding: emb,
        match_count: 3,
        filter_user_id: user.id,
      });

      if (rpcErr) throw rpcErr;
      if (matched && matched.length > 0) {
        topicContexts.push({
          topic,
          chunks: matched.map((m: any) => ({
            id: m.id,
            content: m.content,
            section_label: m.section_label || "Notes",
          })),
        });
      }
    }

    if (topicContexts.length === 0) {
      return NextResponse.json(
        { error: "Upload material and generate topics first" },
        { status: 400 }
      );
    }

    const buildPrompt = (contexts: typeof topicContexts) => {
      const blocks = contexts
        .map(
          (tc) =>
            `### Topic: "${tc.topic.name}" [topic_id: "${tc.topic.id}"]\n` +
            tc.chunks
              .map(
                (c) =>
                  `[Chunk ID: "${c.id}" | Section: "${c.section_label}"]\n${c.content}`
              )
              .join("\n\n")
        )
        .join("\n\n====================\n\n");

      return `
You are an academic assessment engine. Generate 1 multiple-choice question (4 options) for each Topic below.
RULE: Use only the provided context. If the context is insufficient, skip the topic. Do not use outside knowledge.
For each question:
- "topic_id" MUST be the exact topic_id provided.
- "source_chunk_id" MUST be one of the exact Chunk IDs provided for that topic.
- "citation_quote" MUST be an exact verbatim substring copied directly from that source chunk (at least 15 characters).
- "correct_answer" MUST exactly match one of the 4 "options".

Return strictly JSON matching:
{
  "questions": [
    {
      "topic_id": "uuid",
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "source_chunk_id": "chunk-uuid",
      "citation_quote": "exact verbatim substring from chunk",
      "explanation": "Explanation based strictly on the chunk"
    }
  ]
}

Provided Context:
${blocks}
`;
    };

    const chunkMap = new Map<string, { id: string; content: string; section_label: string }>();
    topicContexts.forEach((tc) => {
      tc.chunks.forEach((c) => chunkMap.set(c.id, c));
    });

    const verifiedByTopic = new Map<string, any>();

    const validateAndCollect = (questions: any[]) => {
      for (const q of questions) {
        if (!q.topic_id || verifiedByTopic.has(q.topic_id)) continue;
        const sourceChunk = chunkMap.get(q.source_chunk_id);
        if (!sourceChunk) continue;
        const quote = (q.citation_quote || "").trim();
        if (quote.length < 8) continue;

        const normChunk = sourceChunk.content.toLowerCase().replace(/\s+/g, " ");
        const normQuote = quote.toLowerCase().replace(/\s+/g, " ");
        if (!normChunk.includes(normQuote)) continue;

        if (!Array.isArray(q.options) || q.options.length < 2) continue;
        if (!q.options.some((o: string) => o.trim() === q.correct_answer.trim())) continue;

        verifiedByTopic.set(q.topic_id, q);
      }
    };

    // First Gemini call (15-second timeout)
    const raw1 = await generateStructuredTextWithTimeout(
      buildPrompt(topicContexts),
      undefined,
      15000
    );
    const parsed1 = QuizQuestionsSchema.parse(JSON.parse(raw1));
    validateAndCollect(parsed1.questions || []);

    // Retry once for any missing topics
    const missingContexts = topicContexts.filter((tc) => !verifiedByTopic.has(tc.topic.id));
    if (missingContexts.length > 0) {
      try {
        const raw2 = await generateStructuredTextWithTimeout(
          buildPrompt(missingContexts),
          undefined,
          15000
        );
        const parsed2 = QuizQuestionsSchema.parse(JSON.parse(raw2));
        validateAndCollect(parsed2.questions || []);
      } catch {
        // Proceed with verified questions from first pass
      }
    }

    if (verifiedByTopic.size === 0) {
      return NextResponse.json(
        { error: "Could not generate grounded questions with verified citations from your material." },
        { status: 422 }
      );
    }

    const attemptId = crypto.randomUUID();
    const { error: attErr } = await supabase.from("quiz_attempts").insert({
      id: attemptId,
      user_id: user.id,
      score: 0,
    });
    if (attErr) throw attErr;

    const topicNameById = new Map(selectedTopics.map((t) => [t.id, t.name]));
    const dbQuestions = Array.from(verifiedByTopic.values()).map((q) => ({
      id: crypto.randomUUID(),
      attempt_id: attemptId,
      topic_id: q.topic_id,
      question: q.question,
      options: q.options,
      correct_answer: q.correct_answer,
      source_chunk_id: q.source_chunk_id,
      explanation: q.explanation,
      citation_quote: q.citation_quote,
    }));

    const { error: qInsertErr } = await supabase.from("quiz_questions").insert(dbQuestions);
    if (qInsertErr) throw qInsertErr;

    // Do NOT send correct_answer to the browser
    const clientQuestions = dbQuestions.map((q) => ({
      id: q.id,
      attempt_id: q.attempt_id,
      topic_id: q.topic_id,
      topic_name: topicNameById.get(q.topic_id) || "Topic",
      question: q.question,
      options: q.options,
      source_chunk_id: q.source_chunk_id,
    }));

    return NextResponse.json({
      attemptId,
      questions: clientQuestions,
    });
  } catch (error: any) {
    console.error("Quiz generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate diagnostic quiz" },
      { status: 500 }
    );
  }
}

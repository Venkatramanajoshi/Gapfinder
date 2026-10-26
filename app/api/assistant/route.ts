import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import {
  generateEmbedding,
  generateStructuredTextWithTimeout,
} from "@/lib/ai/gemini";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await req.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const queryEmbedding = await generateEmbedding(query);

    const { data: matched, error: matchErr } = await supabase.rpc("match_chunks", {
      query_embedding: queryEmbedding,
      match_count: 4,
      filter_user_id: user.id,
    });

    if (matchErr) throw matchErr;

    if (!matched || matched.length === 0) {
      return NextResponse.json({
        answer: "Not found in your material.",
        citations: [],
      });
    }

    const topSimilarity = matched[0]?.similarity ?? 0;
    if (topSimilarity < 0.35) {
      return NextResponse.json({
        answer: "Not found in your material.",
        citations: [],
      });
    }

    const relevantChunks = matched.filter((m: any) => (m.similarity ?? 0) >= 0.30);
    const chunkIds = relevantChunks.map((c: any) => c.id);
    const { data: chunkMeta } = await supabase
      .from("chunks")
      .select("id, page, section_label")
      .in("id", chunkIds)
      .eq("user_id", user.id);

    const pageById: Record<string, number> = {};
    (chunkMeta || []).forEach((cm: any) => {
      pageById[cm.id] = cm.page || 1;
    });

    const context = relevantChunks
      .map(
        (c: any) =>
          `[Source: ${c.section_label || "Notes"} | Page ${pageById[c.id] || c.page || 1}] ${c.content}`
      )
      .join("\n\n---\n\n");

    const prompt = `
Answer the student's question based SOLELY on the provided context chunks.
If the context does not contain enough information to answer the question, respond with the exact phrase: "Not found in your material."
Do not extrapolate or use outside knowledge. Cite the section names inline when stating facts.

Return JSON in this exact format:
{
  "answer": "Your grounded explanation or 'Not found in your material.'"
}

Context:
${context}

Student Question: ${query}
`;

    const rawJson = await generateStructuredTextWithTimeout(
      prompt,
      "You are an academic mentor answering solely from provided notes. Return valid JSON with an 'answer' string.",
      15000
    );

    let answer = "Not found in your material.";
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed && typeof parsed.answer === "string") {
        answer = parsed.answer.trim();
      }
    } catch {
      answer = rawJson.trim();
    }

    const isNotFound = answer.toLowerCase().includes("not found in your material");
    const citations = isNotFound
      ? []
      : relevantChunks.map((c: any) => ({
          section: c.section_label || "Uploaded Notes",
          page: pageById[c.id] || c.page || 1,
          snippet: c.content.slice(0, 160) + "...",
        }));

    return NextResponse.json({
      answer: answer || "Not found in your material.",
      citations,
    });
  } catch (error: any) {
    console.error("Assistant API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process question" },
      { status: 500 }
    );
  }
}

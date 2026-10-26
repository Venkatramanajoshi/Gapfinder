import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import {
  generateStructuredTextWithTimeout,
  generateBatchEmbeddings,
  cosineSimilarity,
} from "@/lib/ai/gemini";
import { TopicTreeSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

export async function POST() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let { data: chunks, error: chunkErr } = await supabase
      .from("chunks")
      .select("id, content, documents!inner(type)")
      .eq("user_id", user.id)
      .eq("documents.type", "syllabus")
      .limit(12);

    if (chunkErr || !chunks || chunks.length === 0) {
      const fallback = await supabase
        .from("chunks")
        .select("id, content")
        .eq("user_id", user.id)
        .limit(12);
      if (fallback.error) throw fallback.error;
      chunks = (fallback.data as any) || [];
    }

    if (!chunks || chunks.length === 0) {
      return NextResponse.json(
        { error: "Upload material first before generating topics." },
        { status: 400 }
      );
    }

    const contextText = chunks.map((c: any) => c.content).join("\n\n");
    const prompt = `
Extract a structured academic hierarchy from this course material.
Group into 3 to 6 major topics, each with 2 to 4 key subtopics.

Return strictly JSON matching this structure:
{
  "topics": [
    { "name": "Topic Name", "subtopics": ["Subtopic A", "Subtopic B"] }
  ]
}

Course Material:
${contextText.slice(0, 12000)}
`;

    let parsedTopics: { name: string; subtopics: string[] }[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const rawJson = await generateStructuredTextWithTimeout(
          prompt,
          "You extract academic topic trees from course material. Return strictly JSON matching the schema.",
          15000
        );
        const parsed = TopicTreeSchema.parse(JSON.parse(rawJson));
        parsedTopics = parsed.topics;
        break;
      } catch (err) {
        if (attempt === 1) {
          throw new Error(
            `Failed to generate valid topic tree from Gemini: ${(err as Error).message}`
          );
        }
      }
    }

    // Delete user's existing topics first (no duplicates)
    const { error: delErr } = await supabase
      .from("topics")
      .delete()
      .eq("user_id", user.id);
    if (delErr) throw delErr;

    const insertedTopics: { id: string; name: string; isLeaf: boolean }[] = [];
    for (const t of parsedTopics) {
      const parentId = crypto.randomUUID();
      const hasSubtopics = Boolean(t.subtopics && t.subtopics.length > 0);
      const { data: parent, error: pErr } = await supabase
        .from("topics")
        .insert({
          id: parentId,
          user_id: user.id,
          name: t.name,
          parent_id: null,
        })
        .select()
        .single();

      if (pErr) throw pErr;
      if (parent) {
        insertedTopics.push({ id: parent.id, name: parent.name, isLeaf: !hasSubtopics });

        if (hasSubtopics) {
          const childInserts = t.subtopics.map((subName: string) => ({
            id: crypto.randomUUID(),
            user_id: user.id,
            name: subName,
            parent_id: parent.id,
          }));
          const { data: children, error: cErr } = await supabase
            .from("topics")
            .insert(childInserts)
            .select();

          if (cErr) throw cErr;
          if (children) {
            children.forEach((c) =>
              insertedTopics.push({ id: c.id, name: c.name, isLeaf: true })
            );
          }
        }
      }
    }

    // Embed each topic name ONCE in batch
    const candidateTopics = insertedTopics.filter((t) => t.isLeaf);
    const topicsToEmbed = candidateTopics.length > 0 ? candidateTopics : insertedTopics;
    const topicEmbeddings = await generateBatchEmbeddings(
      topicsToEmbed.map((t) => t.name),
      5
    );

    const { data: userChunks, error: allChunksErr } = await supabase
      .from("chunks")
      .select("id, embedding")
      .eq("user_id", user.id);

    if (allChunksErr) throw allChunksErr;

    // Assign each chunk to its closest topic by cosine similarity
    if (userChunks && userChunks.length > 0) {
      for (const chunk of userChunks) {
        let vec: number[] | null = null;
        if (Array.isArray(chunk.embedding)) {
          vec = chunk.embedding;
        } else if (typeof chunk.embedding === "string") {
          try {
            vec = JSON.parse(chunk.embedding);
          } catch {
            vec = null;
          }
        }
        if (!vec || vec.length === 0) continue;

        let bestTopicId = topicsToEmbed[0].id;
        let bestSim = -Infinity;
        for (let i = 0; i < topicsToEmbed.length; i++) {
          const sim = cosineSimilarity(vec, topicEmbeddings[i]);
          if (sim > bestSim) {
            bestSim = sim;
            bestTopicId = topicsToEmbed[i].id;
          }
        }

        const { error: updErr } = await supabase
          .from("chunks")
          .update({ topic_id: bestTopicId })
          .eq("id", chunk.id)
          .eq("user_id", user.id);
        if (updErr) throw updErr;
      }
    }

    return NextResponse.json({
      success: true,
      count: insertedTopics.length,
    });
  } catch (error: any) {
    console.error("Topic generation error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate topic tree" },
      { status: 500 }
    );
  }
}

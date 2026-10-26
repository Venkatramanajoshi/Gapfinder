import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: topics, error: topicErr } = await supabase
      .from("topics")
      .select("id, name, parent_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (topicErr) throw topicErr;

    const { data: scores, error: scoreErr } = await supabase
      .from("topic_scores")
      .select("topic_id, score, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (scoreErr) throw scoreErr;

    const latestScoreByTopic: Record<string, any> = {};
    (scores || []).forEach((s) => {
      if (!latestScoreByTopic[s.topic_id]) {
        const numericScore = Number(s.score);
        let category: "weak" | "medium" | "strong" = "medium";
        if (numericScore >= 75) category = "strong";
        else if (numericScore < 40) category = "weak";
        latestScoreByTopic[s.topic_id] = {
          ...s,
          score: numericScore,
          category,
        };
      }
    });

    const { data: chunks, error: chunkErr } = await supabase
      .from("chunks")
      .select("topic_id")
      .eq("user_id", user.id);

    if (chunkErr) throw chunkErr;

    const chunkCounts: Record<string, number> = {};
    (chunks || []).forEach((c) => {
      if (c.topic_id) {
        chunkCounts[c.topic_id] = (chunkCounts[c.topic_id] || 0) + 1;
      }
    });

    const parents = (topics || []).filter((t) => !t.parent_id);
    const hierarchy = parents.map((p) => {
      const subtopics = (topics || [])
        .filter((t) => t.parent_id === p.id)
        .map((sub) => {
          const scoreItem = latestScoreByTopic[sub.id];
          return {
            ...sub,
            score: scoreItem ? Math.round(scoreItem.score) : null,
            category: scoreItem ? scoreItem.category : "unscored",
            reason: scoreItem ? scoreItem.reason : null,
            chunkCount: chunkCounts[sub.id] || 0,
          };
        });

      const parentScoreItem = latestScoreByTopic[p.id];
      const scoredSubs = subtopics.filter((st) => st.score !== null);
      const avgSubScore =
        scoredSubs.length > 0
          ? Math.round(
              scoredSubs.reduce((acc, st) => acc + (st.score || 0), 0) / scoredSubs.length
            )
          : null;
      const effectiveParentScore = parentScoreItem
        ? Math.round(parentScoreItem.score)
        : avgSubScore;
      let effectiveParentCategory = "unscored";
      if (effectiveParentScore !== null) {
        if (effectiveParentScore >= 75) effectiveParentCategory = "strong";
        else if (effectiveParentScore < 40) effectiveParentCategory = "weak";
        else effectiveParentCategory = "medium";
      }

      const parentChunks =
        (chunkCounts[p.id] || 0) +
        subtopics.reduce((acc, st) => acc + (st.chunkCount || 0), 0);

      return {
        ...p,
        score: effectiveParentScore,
        category: effectiveParentCategory,
        chunkCount: parentChunks,
        subtopics,
      };
    });

    return NextResponse.json({
      topics: hierarchy,
      rawCount: (topics || []).length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load topics" },
      { status: 500 }
    );
  }
}

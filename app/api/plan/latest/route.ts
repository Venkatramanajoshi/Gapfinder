import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: latestPlan, error: planErr } = await supabase
      .from("revision_plans")
      .select("plan_json, days_available, hours_per_day, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (planErr) throw planErr;

    const { data: scores, error: scoreErr } = await supabase
      .from("topic_scores")
      .select("topic_id, score, reason, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (scoreErr) throw scoreErr;

    const { data: topics, error: topicErr } = await supabase
      .from("topics")
      .select("id, name")
      .eq("user_id", user.id);

    if (topicErr) throw topicErr;

    const topicNameMap: Record<string, string> = {};
    (topics || []).forEach((t) => {
      topicNameMap[t.id] = t.name;
    });

    const latestGapsMap: Record<string, any> = {};
    (scores || []).forEach((s) => {
      if (!latestGapsMap[s.topic_id]) {
        const numericScore = Number(s.score);
        let category: "weak" | "medium" | "strong" = "medium";
        if (numericScore < 40) category = "weak";
        else if (numericScore >= 75) category = "strong";

        latestGapsMap[s.topic_id] = {
          topic_id: s.topic_id,
          topic_name: topicNameMap[s.topic_id] || "Topic Area",
          score: Math.round(numericScore),
          category,
          reason: s.reason,
        };
      }
    });

    return NextResponse.json({
      plan: latestPlan ? latestPlan.plan_json : null,
      daysAvailable: latestPlan?.days_available ?? 5,
      hoursPerDay: latestPlan ? Number(latestPlan.hours_per_day) : 3,
      gaps: Object.values(latestGapsMap),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load latest revision plan" },
      { status: 500 }
    );
  }
}

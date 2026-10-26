import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import { generateStructuredTextWithTimeout } from "@/lib/ai/gemini";
import { GapReportSchema, RevisionPlanSchema } from "@/lib/ai/schemas";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { daysAvailable = 5, hoursPerDay = 3, attemptId } = await req.json();

    let targetAttemptId = attemptId;
    if (!targetAttemptId) {
      const { data: latestAtt, error: attErr } = await supabase
        .from("quiz_attempts")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (attErr) throw attErr;
      targetAttemptId = latestAtt?.id;
    }

    if (!targetAttemptId) {
      return NextResponse.json(
        { error: "No quiz attempts found. Complete a diagnostic quiz first." },
        { status: 400 }
      );
    }

    const { data: questions, error: qErr } = await supabase
      .from("quiz_questions")
      .select("topic_id, is_correct, question, user_answer, correct_answer, chunks(content)")
      .eq("attempt_id", targetAttemptId);

    if (qErr) throw qErr;

    if (!questions || questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found for this quiz attempt." },
        { status: 400 }
      );
    }

    const topicIds = Array.from(new Set(questions.map((q) => q.topic_id)));
    const { data: topics, error: tErr } = await supabase
      .from("topics")
      .select("id, name")
      .in("id", topicIds);

    if (tErr) throw tErr;

    const topicNameMap: Record<string, string> = {};
    (topics || []).forEach((t) => {
      topicNameMap[t.id] = t.name;
    });

    // Compute per-topic scores in code: Strong >= 75%, Medium 40-74%, Weak < 40%
    const topicStats: Record<
      string,
      { total: number; correct: number; mistakes: string[]; excerpts: string[] }
    > = {};

    questions.forEach((q: any) => {
      if (!topicStats[q.topic_id]) {
        topicStats[q.topic_id] = { total: 0, correct: 0, mistakes: [], excerpts: [] };
      }
      topicStats[q.topic_id].total += 1;
      const chunkObj = Array.isArray(q.chunks) ? q.chunks[0] : q.chunks;
      if (chunkObj?.content) {
        topicStats[q.topic_id].excerpts.push(chunkObj.content.slice(0, 250));
      }
      if (q.is_correct) {
        topicStats[q.topic_id].correct += 1;
      } else {
        topicStats[q.topic_id].mistakes.push(
          `Question: "${q.question}" | Chosen: "${q.user_answer}" | Correct: "${q.correct_answer}"`
        );
      }
    });

    // Check if topic_scores already exist for this attempt
    const { data: existingScores, error: existErr } = await supabase
      .from("topic_scores")
      .select("topic_id, score, reason")
      .eq("attempt_id", targetAttemptId)
      .eq("user_id", user.id);

    if (existErr) throw existErr;

    const existingReasonByTopic: Record<string, string> = {};
    (existingScores || []).forEach((es) => {
      if (es.reason) existingReasonByTopic[es.topic_id] = es.reason;
    });

    const computedGaps = Object.entries(topicStats).map(([topicId, stats]) => {
      const score = Math.round((stats.correct / stats.total) * 100);
      let category: "weak" | "medium" | "strong" = "medium";
      if (score < 40) category = "weak";
      else if (score >= 75) category = "strong";

      const topicName = topicNameMap[topicId] || "Core Topic";
      return {
        topic_id: topicId,
        topic_name: topicName,
        score,
        category,
        mistakes: stats.mistakes,
        excerpts: stats.excerpts,
        reason: existingReasonByTopic[topicId] || "",
      };
    });

    const needsReasonGeneration = computedGaps.some((g) => !g.reason);
    if (needsReasonGeneration) {
      const reasonPrompt = `
Write a concise one-line academic diagnosis for each tested topic based on the student's wrong answers and source chunk excerpts:
${JSON.stringify(
  computedGaps.map((g) => ({
    topic_id: g.topic_id,
    topic_name: g.topic_name,
    score: g.score,
    category: g.category,
    mistakes: g.mistakes,
    excerpts: g.excerpts,
  })),
  null,
  2
)}

Return strictly JSON matching:
{
  "topicGaps": [
    { "topic_id": "topicId", "topic_name": "topicName", "score": 0, "category": "weak", "reason": "One concise sentence" }
  ]
}
`;

      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const rawJson = await generateStructuredTextWithTimeout(reasonPrompt, undefined, 15000);
          const parsed = GapReportSchema.parse(JSON.parse(rawJson));
          parsed.topicGaps.forEach((pg) => {
            const match = computedGaps.find((cg) => cg.topic_id === pg.topic_id);
            if (match && pg.reason) match.reason = pg.reason;
          });
          break;
        } catch {
          // Retry once, then fall back to simple template below
        }
      }
    }

    const finalGaps = computedGaps.map((cg) => {
      let reason = cg.reason;
      if (!reason) {
        if (cg.category === "weak") {
          reason = `Core conceptual gap in ${cg.topic_name} based on missed diagnostic questions.`;
        } else if (cg.category === "medium") {
          reason = `Partial mastery of ${cg.topic_name}; review missed edge-case details.`;
        } else {
          reason = `Demonstrated strong mastery of ${cg.topic_name}.`;
        }
      }
      return {
        topic_id: cg.topic_id,
        topic_name: cg.topic_name,
        score: cg.score,
        category: cg.category,
        reason,
      };
    });

    if (!existingScores || existingScores.length === 0) {
      await supabase.from("topic_scores").insert(
        finalGaps.map((g) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          topic_id: g.topic_id,
          attempt_id: targetAttemptId,
          score: g.score,
          reason: g.reason,
        }))
      );
    }

    // Generate revision schedule allocating 60% weak, 30% medium, 10% strong
    const planPrompt = `
Create an optimal revision plan given:
Days available: ${daysAvailable}
Hours per day: ${hoursPerDay}
Student Topic Diagnostics:
${JSON.stringify(finalGaps, null, 2)}

Prioritization Rules:
- Weak topics (<40%) MUST receive top priority and 60% of total schedule time.
- Medium topics (40-74%) receive 30% of total time.
- Strong topics (>=75%) receive light review (10%).

Return strictly JSON matching:
{
  "schedule": [
    {
      "day": 1,
      "theme": "Theme title",
      "allocated_hours": ${hoursPerDay},
      "tasks": [
        {
          "topic_name": "Topic Name",
          "category": "weak",
          "activity": "Specific practice exercise",
          "duration_minutes": 60
        }
      ]
    }
  ]
}
`;

    let planSchedule: any[] = [];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const planRaw = await generateStructuredTextWithTimeout(planPrompt, undefined, 20000);
        const parsedPlan = RevisionPlanSchema.parse(JSON.parse(planRaw));
        if (parsedPlan.schedule && parsedPlan.schedule.length > 0) {
          planSchedule = parsedPlan.schedule;
          break;
        }
      } catch {
        // Retry once
      }
    }

    if (planSchedule.length === 0) {
      const weak = finalGaps.filter((g) => g.category === "weak");
      const med = finalGaps.filter((g) => g.category === "medium");
      const strong = finalGaps.filter((g) => g.category === "strong");
      const fallbackPool = [...weak, ...med, ...strong];

      for (let day = 1; day <= daysAvailable; day++) {
        const primary = fallbackPool[(day - 1) % fallbackPool.length];
        const secondary = fallbackPool[day % fallbackPool.length];
        const tasks: any[] = [];
        if (primary) {
          tasks.push({
            topic_name: primary.topic_name,
            category: primary.category,
            activity: `Focused review and problem tracing on ${primary.topic_name} (${primary.reason})`,
            duration_minutes: Math.round(hoursPerDay * 60 * 0.6),
          });
        }
        if (secondary && secondary.topic_id !== primary?.topic_id) {
          tasks.push({
            topic_name: secondary.topic_name,
            category: secondary.category,
            activity: `Practice questions and note consolidation for ${secondary.topic_name}`,
            duration_minutes: Math.round(hoursPerDay * 60 * 0.4),
          });
        } else if (primary) {
          tasks.push({
            topic_name: primary.topic_name,
            category: primary.category,
            activity: `Self-test quiz and source note verification for ${primary.topic_name}`,
            duration_minutes: Math.round(hoursPerDay * 60 * 0.4),
          });
        }
        planSchedule.push({
          day,
          theme: primary ? `Priority Focus: ${primary.topic_name}` : `Day ${day} Study Session`,
          allocated_hours: hoursPerDay,
          tasks,
        });
      }
    }

    const { error: planInsertErr } = await supabase.from("revision_plans").insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      days_available: daysAvailable,
      hours_per_day: hoursPerDay,
      plan_json: planSchedule,
    });

    if (planInsertErr) throw planInsertErr;

    return NextResponse.json({
      success: true,
      plan: planSchedule,
      gaps: finalGaps,
      attemptId: targetAttemptId,
    });
  } catch (error: any) {
    console.error("Plan generate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate revision plan" },
      { status: 500 }
    );
  }
}

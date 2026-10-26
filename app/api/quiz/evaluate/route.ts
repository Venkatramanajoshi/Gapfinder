import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import { generateStructuredTextWithTimeout } from "@/lib/ai/gemini";
import { GapReportSchema, RevisionPlanSchema } from "@/lib/ai/schemas";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questionId, userAnswer, attemptId } = await req.json();

    if (!questionId || userAnswer === undefined || !attemptId) {
      return NextResponse.json(
        { error: "questionId, userAnswer, and attemptId are required" },
        { status: 400 }
      );
    }

    const { data: question, error: qErr } = await supabase
      .from("quiz_questions")
      .select("*, chunks(id, content, section_label, page)")
      .eq("id", questionId)
      .single();

    if (qErr || !question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const chunk = question.chunks;
    const isCorrect =
      question.correct_answer.trim().toLowerCase() === String(userAnswer).trim().toLowerCase();

    const { error: updateQErr } = await supabase
      .from("quiz_questions")
      .update({
        user_answer: userAnswer,
        is_correct: isCorrect,
      })
      .eq("id", questionId);

    if (updateQErr) throw updateQErr;

    const { data: allQuestions, error: allQErr } = await supabase
      .from("quiz_questions")
      .select("id, is_correct, topic_id, user_answer, question, correct_answer, citation_quote, chunks(content, section_label)")
      .eq("attempt_id", attemptId);

    if (allQErr) throw allQErr;

    const answered = (allQuestions || []).filter(
      (q) => q.is_correct !== null && q.is_correct !== undefined
    );
    const correctCount = answered.filter((q) => q.is_correct).length;
    const scorePercentage =
      answered.length > 0 ? Math.round((correctCount / answered.length) * 100) : 0;

    const { error: updateAttErr } = await supabase
      .from("quiz_attempts")
      .update({ score: scorePercentage })
      .eq("id", attemptId)
      .eq("user_id", user.id);

    if (updateAttErr) throw updateAttErr;

    const isCompleted =
      (allQuestions || []).length > 0 && answered.length === (allQuestions || []).length;

    if (isCompleted) {
      const topicGroup: Record<
        string,
        { total: number; correct: number; mistakes: string[]; excerpts: string[] }
      > = {};

      for (const q of allQuestions || []) {
        if (!topicGroup[q.topic_id]) {
          topicGroup[q.topic_id] = { total: 0, correct: 0, mistakes: [], excerpts: [] };
        }
        topicGroup[q.topic_id].total++;
        const chunkObj: any = Array.isArray(q.chunks) ? q.chunks[0] : q.chunks;
        if (chunkObj?.content) {
          topicGroup[q.topic_id].excerpts.push(chunkObj.content.slice(0, 250));
        }
        if (q.is_correct) {
          topicGroup[q.topic_id].correct++;
        } else {
          topicGroup[q.topic_id].mistakes.push(
            `Question: "${q.question}" | Student answered: "${q.user_answer}" | Correct: "${q.correct_answer}"`
          );
        }
      }

      const { data: dbTopics } = await supabase
        .from("topics")
        .select("id, name")
        .in("id", Object.keys(topicGroup));

      const topicNameMap: Record<string, string> = {};
      (dbTopics || []).forEach((t) => {
        topicNameMap[t.id] = t.name;
      });

      const computedGaps = Object.entries(topicGroup).map(([topicId, stats]) => {
        const score = Math.round((stats.correct / stats.total) * 100);
        let category: "weak" | "medium" | "strong" = "medium";
        if (score < 40) category = "weak";
        else if (score >= 75) category = "strong";

        const topicName = topicNameMap[topicId] || "Topic";
        const defaultReason =
          category === "weak"
            ? `Needs review of core concepts in ${topicName} (${stats.correct}/${stats.total} correct).`
            : category === "medium"
            ? `Partial mastery of ${topicName}; review missed details (${stats.correct}/${stats.total} correct).`
            : `Strong mastery demonstrated in ${topicName} (${stats.correct}/${stats.total} correct).`;

        return {
          topic_id: topicId,
          topic_name: topicName,
          score,
          category,
          mistakes: stats.mistakes,
          excerpts: stats.excerpts,
          reason: defaultReason,
        };
      });

      const reasonPrompt = `
Write a concise one-line diagnostic reason per topic based on the student's actual wrong answers and source chunk excerpts:
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
    { "topic_id": "uuid", "topic_name": "name", "score": 0, "category": "weak", "reason": "One concise sentence" }
  ]
}
`;

      for (let retry = 0; retry < 2; retry++) {
        try {
          const rawReason = await generateStructuredTextWithTimeout(reasonPrompt, undefined, 15000);
          const parsed = GapReportSchema.parse(JSON.parse(rawReason));
          parsed.topicGaps.forEach((pg) => {
            const match = computedGaps.find((cg) => cg.topic_id === pg.topic_id);
            if (match && pg.reason) match.reason = pg.reason;
          });
          break;
        } catch {
          // Retry once, then keep template fallback
        }
      }

      // Delete any existing topic_scores for this attempt before inserting
      await supabase.from("topic_scores").delete().eq("attempt_id", attemptId);

      const { error: tsErr } = await supabase.from("topic_scores").insert(
        computedGaps.map((g) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          topic_id: g.topic_id,
          attempt_id: attemptId,
          score: g.score,
          reason: g.reason,
        }))
      );
      if (tsErr) throw tsErr;

      // Regenerate revision plan after every completed attempt
      const { data: prevPlan } = await supabase
        .from("revision_plans")
        .select("days_available, hours_per_day")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const daysAvailable = prevPlan?.days_available ?? 5;
      const hoursPerDay = Number(prevPlan?.hours_per_day ?? 3);

      const planPrompt = `
Create a prioritized day-by-day revision plan given:
Days available: ${daysAvailable}
Hours per day: ${hoursPerDay}
Topic Diagnostics:
${JSON.stringify(
  computedGaps.map((g) => ({
    topic_name: g.topic_name,
    score: g.score,
    category: g.category,
    reason: g.reason,
  })),
  null,
  2
)}

Prioritization Rules:
- Weak topics (<40%) MUST receive 60% of total schedule time.
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
          "activity": "Specific study activity",
          "duration_minutes": 60
        }
      ]
    }
  ]
}
`;

      try {
        const planRaw = await generateStructuredTextWithTimeout(planPrompt, undefined, 15000);
        const parsedPlan = RevisionPlanSchema.parse(JSON.parse(planRaw));
        if (parsedPlan.schedule && parsedPlan.schedule.length > 0) {
          await supabase.from("revision_plans").insert({
            id: crypto.randomUUID(),
            user_id: user.id,
            days_available: daysAvailable,
            hours_per_day: hoursPerDay,
            plan_json: parsedPlan.schedule,
          });
        }
      } catch {
        // Plan can also be regenerated on /plan or /report
      }
    }

    return NextResponse.json({
      isCorrect,
      correctAnswer: question.correct_answer,
      explanation: question.explanation,
      citationQuote: question.citation_quote || (chunk ? chunk.content.slice(0, 160) : ""),
      sourceCitation: chunk
        ? `Section: ${chunk.section_label || "Notes"} (Page ${chunk.page || 1})`
        : "Verified Course Material",
      isCompleted,
    });
  } catch (error: any) {
    console.error("Quiz evaluate error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to evaluate answer" },
      { status: 500 }
    );
  }
}

import { z } from "zod";

export const TopicTreeSchema = z.object({
  topics: z
    .array(
      z.object({
        name: z.string().min(1).describe("Topic name"),
        subtopics: z.array(z.string().min(1)).min(1),
      })
    )
    .min(1),
});

export const QuizQuestionsSchema = z.object({
  questions: z.array(
    z.object({
      topic_id: z.string().min(1),
      question: z.string().min(5),
      options: z.array(z.string().min(1)).min(2).max(4),
      correct_answer: z.string().min(1),
      source_chunk_id: z.string().min(1).describe("ID of the exact source chunk"),
      citation_quote: z.string().min(5).describe("Exact substring quote from the chunk"),
      explanation: z.string().min(5),
    })
  ),
});

export const EvaluationSchema = z.object({
  is_correct: z.boolean(),
  explanation: z.string(),
  reference_quote: z.string().optional(),
});

export const GapReportSchema = z.object({
  topicGaps: z.array(
    z.object({
      topic_id: z.string(),
      topic_name: z.string(),
      score: z.number(),
      category: z.enum(["weak", "medium", "strong"]),
      reason: z.string().min(5).describe("One-line concise reason from student mistakes"),
    })
  ),
});

export const RevisionPlanSchema = z.object({
  schedule: z
    .array(
      z.object({
        day: z.number(),
        theme: z.string(),
        allocated_hours: z.number(),
        tasks: z.array(
          z.object({
            topic_name: z.string(),
            category: z.enum(["weak", "medium", "strong"]),
            activity: z.string(),
            duration_minutes: z.number(),
          })
        ),
      })
    )
    .min(1),
});

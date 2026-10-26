import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
export const defaultTextModel = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
export const defaultEmbedModel = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2-preview";

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "AIzaSy...") {
    throw new Error("Missing or invalid GEMINI_API_KEY environment variable.");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

/**
 * L2-normalizes a numeric vector to unit length.
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) {
    throw new Error("Cannot normalize a zero-magnitude embedding vector.");
  }
  return vec.map((v) => v / norm);
}

/**
 * Computes cosine similarity between two 768-dim vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Generates a normalized 768-dim embedding vector using GEMINI_EMBED_MODEL.
 * Explicitly sets outputDimensionality: 768 to match PostgreSQL vector(768).
 * Throws a clear error if embedding fails (no fake or hash fallback).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const ai = getGeminiClient();
  const cleanedText = text.replace(/\s+/g, " ").trim().slice(0, 4000);
  if (!cleanedText) {
    throw new Error("Cannot generate embedding for empty text content.");
  }

  try {
    const response = await ai.models.embedContent({
      model: defaultEmbedModel,
      contents: cleanedText,
      config: {
        outputDimensionality: 768,
      },
    });

    const values =
      response.embeddings?.[0]?.values || (response as any).embedding?.values;

    if (!values || values.length !== 768) {
      throw new Error(
        `Embedding model (${defaultEmbedModel}) did not return a 768-dimensional vector.`
      );
    }

    return normalizeVector(values);
  } catch (error: any) {
    throw new Error(
      `Gemini embedding failed (${defaultEmbedModel}): ${error.message || "Unknown error"}`
    );
  }
}

/**
 * Generates normalized 768-dim embeddings in batches.
 */
export async function generateBatchEmbeddings(
  texts: string[],
  batchSize = 5
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map((txt) => generateEmbedding(txt)));
    results.push(...batchResults);
  }
  return results;
}

/**
 * Generates structured JSON text with ThinkingLevel.LOW and a strict timeout.
 */
export async function generateStructuredTextWithTimeout(
  prompt: string,
  systemInstruction?: string,
  timeoutMs = 15000
): Promise<string> {
  const ai = getGeminiClient();

  const generatePromise = (async () => {
    const response = await ai.models.generateContent({
      model: defaultTextModel,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        systemInstruction:
          systemInstruction ||
          "You are an academic assessment engine. Return only strict JSON matching the requested schema.",
      },
    });
    const text = response.text || "";
    return text.replace(/```json\n?|\n?```/g, "").trim();
  })();

  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(
      () =>
        reject(
          new Error(`Gemini request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
        ),
      timeoutMs
    );
  });

  return Promise.race([generatePromise, timeoutPromise]);
}

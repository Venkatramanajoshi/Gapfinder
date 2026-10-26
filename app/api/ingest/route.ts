import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";
import { chunkText } from "@/lib/rag/chunker";
import { generateBatchEmbeddings } from "@/lib/ai/gemini";
// @ts-ignore
import * as pdfParsePkg from "pdf-parse";
const pdfParse: any = (pdfParsePkg as any).default || pdfParsePkg;

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let docName = "Uploaded Material";
    let docType: "syllabus" | "notes" | "past_paper" = "notes";
    let extractedText = "";

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const plainText = formData.get("plainText") as string | null;
      const typeParam = formData.get("type") as string | null;
      const nameParam = formData.get("name") as string | null;

      if (nameParam) docName = nameParam;
      if (typeParam === "syllabus" || typeParam === "past_paper" || typeParam === "notes") {
        docType = typeParam;
      }

      if (file) {
        docName = nameParam || file.name.replace(/\.[^/.]+$/, "");
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const parsed = await pdfParse(buffer);
          extractedText = parsed.text;
        } else {
          extractedText = buffer.toString("utf-8");
        }
      } else if (plainText) {
        extractedText = plainText;
      }
    } else {
      const body = await req.json();
      if (body.name) docName = body.name;
      if (body.type === "syllabus" || body.type === "past_paper" || body.type === "notes") {
        docType = body.type;
      }
      extractedText = body.plainText || body.text || "";
    }

    if (!extractedText || !extractedText.trim()) {
      return NextResponse.json(
        { error: "Document content is empty or unreadable." },
        { status: 400 }
      );
    }

    const rawChunks = chunkText(extractedText, 350, 40);
    if (rawChunks.length === 0) {
      return NextResponse.json({ error: "No text chunks could be created." }, { status: 400 });
    }

    const chunkContents = rawChunks.map((c) => c.content);
    const embeddings = await generateBatchEmbeddings(chunkContents, 5);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        name: docName,
        type: docType,
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    const chunkInserts = rawChunks.map((chunk, index) => ({
      document_id: document.id,
      user_id: user.id,
      content: chunk.content,
      section_label: chunk.sectionLabel || `${docName} - Section ${index + 1}`,
      page: chunk.page || 1,
      topic_id: null,
      embedding: embeddings[index],
    }));

    const { error: insertError } = await supabase.from("chunks").insert(chunkInserts);
    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
      documentName: docName,
      chunksCreated: rawChunks.length,
    });
  } catch (error: any) {
    console.error("Ingest API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process document" },
      { status: 500 }
    );
  }
}

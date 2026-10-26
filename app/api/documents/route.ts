import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: documents, error: docError } = await supabase
      .from("documents")
      .select("id, name, type, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (docError) {
      throw docError;
    }

    const { data: chunks, error: chunkError } = await supabase
      .from("chunks")
      .select("document_id")
      .eq("user_id", user.id);

    if (chunkError) {
      throw chunkError;
    }

    const chunkCounts: Record<string, number> = {};
    (chunks || []).forEach((c: { document_id: string }) => {
      chunkCounts[c.document_id] = (chunkCounts[c.document_id] || 0) + 1;
    });

    const enriched = (documents || []).map((doc: any) => ({
      ...doc,
      chunkCount: chunkCounts[doc.id] || 0,
    }));

    return NextResponse.json({ documents: enriched });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load documents" },
      { status: 500 }
    );
  }
}

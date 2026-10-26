import { NextResponse } from "next/server";
import { createServerSupabase, getAuthenticatedUser } from "@/lib/db/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabase();
    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: attempts, error } = await supabase
      .from("quiz_attempts")
      .select("id, score, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ attempts: attempts || [] });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load quiz attempts" },
      { status: 500 }
    );
  }
}

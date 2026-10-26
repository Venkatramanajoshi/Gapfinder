import { NextResponse } from "next/server";
import {
  createServerSupabase,
  LOCAL_SESSION_COOKIE,
} from "@/lib/db/supabase-server";

export async function POST() {
  try {
    const supabase = createServerSupabase();
    await supabase.auth.signOut();
    const response = NextResponse.json({ success: true });
    response.cookies.set(LOCAL_SESSION_COOKIE, "", {
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

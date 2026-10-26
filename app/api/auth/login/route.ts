import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabase,
  isSupabaseConfigured,
  LOCAL_SESSION_COOKIE,
} from "@/lib/db/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { error: error?.message || "Invalid email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    });

    if (!isSupabaseConfigured()) {
      response.cookies.set(LOCAL_SESSION_COOKIE, data.user.id, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to sign in." },
      { status: 500 }
    );
  }
}

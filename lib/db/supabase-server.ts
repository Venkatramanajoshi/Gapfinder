import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createLocalSupabaseServer } from "./local-pg";

export const LOCAL_SESSION_COOKIE = "gapfinder_uid";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      url.startsWith("http") &&
      !url.includes("placeholder-project") &&
      !url.includes("your-project") &&
      !key.includes("placeholder-anon-key") &&
      key !== "eyJhbGciOi..."
  );
}

export function createServerSupabase(): any {
  const cookieStore = cookies();

  if (!isSupabaseConfigured()) {
    const uid = cookieStore.get(LOCAL_SESSION_COOKIE)?.value || null;
    return createLocalSupabaseServer(uid);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Read-only cookie store in Server Components
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options });
        } catch {
          // Read-only cookie store in Server Components
        }
      },
    },
  });
}

/**
 * Validates the authenticated user from the server session cookie.
 */
export async function getAuthenticatedUser(supabase: ReturnType<typeof createServerSupabase>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./supabase-server";
import { createLocalSupabaseServer } from "./local-pg";

export function createAdminSupabase(): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (
    !isSupabaseConfigured() ||
    !serviceRoleKey ||
    serviceRoleKey === "eyJhbGciOi..."
  ) {
    return createLocalSupabaseServer(null);
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

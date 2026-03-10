import { NextResponse } from "next/server";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gemini = process.env.GEMINI_API_KEY;

  // Try a real DB query if Supabase is configured
  let dbStatus = "not configured";
  let avatarCount = 0;
  if (url && serviceRole) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const supabase = createClient(url, serviceRole, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase
        .from("avatars")
        .select("id", { count: "exact" });
      if (error) {
        dbStatus = `query error: ${error.message}`;
      } else {
        avatarCount = data?.length ?? 0;
        dbStatus = "ok";
      }
    } catch (err) {
      dbStatus = `exception: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return NextResponse.json({
    supabaseUrl: url ? `${url.slice(0, 30)}…` : "MISSING",
    anonKey: anon ? `${anon.slice(0, 10)}…` : "MISSING",
    serviceRoleKey: serviceRole ? `${serviceRole.slice(0, 10)}…` : "MISSING",
    geminiKey: gemini ? `${gemini.slice(0, 10)}…` : "MISSING (check Settings)",
    dbStatus,
    avatarCount,
  });
}

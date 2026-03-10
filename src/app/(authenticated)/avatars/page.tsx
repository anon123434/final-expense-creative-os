import { getAvatarsByUser } from "@/lib/repositories/avatar-repo";
import { createClient } from "@/lib/supabase/server";
import { AvatarStudio } from "@/components/avatars/avatar-studio";
import { hasSupabaseEnv, getSupabaseServiceRoleKey } from "@/lib/config/env";

async function getCurrentUserId(): Promise<string> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? "00000000-0000-0000-0000-000000000001";
  } catch {
    return "00000000-0000-0000-0000-000000000001";
  }
}

export default async function AvatarsPage() {
  const userId = await getCurrentUserId();
  const initialAvatars = await getAvatarsByUser(userId);

  const hasSupabase = hasSupabaseEnv();
  const hasServiceKey = !!getSupabaseServiceRoleKey();
  const dbWarning = hasSupabase && !hasServiceKey
    ? "SUPABASE_SERVICE_ROLE_KEY is missing — avatars will not persist between sessions. Add it in Vercel environment variables."
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-6">
        <h1
          className="text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}
        >
          Avatar Studio
        </h1>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground/40">
          db:{hasSupabase ? (hasServiceKey ? "✓ service-role" : "✗ no-service-key") : "mock"}
        </span>
      </div>
      {dbWarning && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-6 py-2 text-xs text-amber-600">
          ⚠ {dbWarning}
        </div>
      )}
      <div className="flex-1 min-h-0">
        <AvatarStudio initialAvatars={initialAvatars} />
      </div>
    </div>
  );
}

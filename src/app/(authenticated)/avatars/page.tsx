import { getAvatarsByUser } from "@/lib/repositories/avatar-repo";
import { createClient } from "@/lib/supabase/server";
import { AvatarStudio } from "@/components/avatars/avatar-studio";

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-6">
        <h1
          className="text-xs font-bold uppercase tracking-widest"
          style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--muted-foreground)" }}
        >
          Avatar Studio
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <AvatarStudio initialAvatars={initialAvatars} />
      </div>
    </div>
  );
}

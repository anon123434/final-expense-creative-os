import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOut } from "lucide-react";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-sidebar px-6">
      <div className="flex items-center gap-2.5">
        <span
          className="h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: "var(--primary)", boxShadow: "0 0 5px var(--primary)" }}
        />
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ color: "var(--border)", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Terminal Active
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="gap-2 text-xs transition-colors text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}

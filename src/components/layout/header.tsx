import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function Header() {
  return (
    <header
      className="flex h-14 items-center justify-between px-6 border-b"
      style={{ background: "#080808", borderColor: "#141414" }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: "#00FF88", boxShadow: "0 0 5px #00FF88" }}
        />
        <span
          className="text-[10px] tracking-widest uppercase"
          style={{ color: "#2A2A2A", fontFamily: "'JetBrains Mono', monospace" }}
        >
          Terminal Active
        </span>
      </div>
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="gap-2 text-xs transition-colors"
          style={{ color: "#2E2E2E", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </form>
    </header>
  );
}

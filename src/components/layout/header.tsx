import { logout } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Server Component — uses form action to call the logout server action
export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />
      <form action={logout}>
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </form>
    </header>
  );
}

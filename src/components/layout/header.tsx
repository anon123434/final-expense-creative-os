// Server Component — auth removed for single-user local mode
export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      <div />
      <span className="text-xs text-muted-foreground">Local Mode</span>
    </header>
  );
}

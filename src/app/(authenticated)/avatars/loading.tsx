export default function AvatarsLoading() {
  return (
    <div className="flex h-full min-h-0 gap-0 animate-pulse">
      <div className="w-[420px] shrink-0 border-r p-6 space-y-4">
        <div className="h-4 w-36 rounded bg-muted" />
        <div className="aspect-video w-full rounded-lg bg-muted" />
        <div className="h-24 w-full rounded bg-muted" />
        <div className="grid grid-cols-2 gap-2">
          <div className="h-16 rounded-md bg-muted" />
          <div className="h-16 rounded-md bg-muted" />
        </div>
        <div className="h-11 w-full rounded-md bg-muted" />
      </div>
      <div className="flex-1 p-6">
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-video rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

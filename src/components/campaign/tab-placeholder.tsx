import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabPlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: string;
  className?: string;
}

export function TabPlaceholder({
  icon: Icon,
  title,
  description,
  hint,
  className,
}: TabPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {hint && (
        <p className="mt-3 text-xs text-muted-foreground/70">{hint}</p>
      )}
    </div>
  );
}

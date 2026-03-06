import { cn } from "@/lib/utils";

type Provider = "claude" | "openai";

const config: Record<Provider, { label: string; className: string }> = {
  claude: {
    label: "Claude",
    className: "bg-orange-50 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800",
  },
  openai: {
    label: "OpenAI",
    className: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800",
  },
};

interface ProviderBadgeProps {
  provider: Provider;
  className?: string;
}

export function ProviderBadge({ provider, className }: ProviderBadgeProps) {
  const { label, className: variantClass } = config[provider];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        variantClass,
        className
      )}
    >
      {label}
    </span>
  );
}

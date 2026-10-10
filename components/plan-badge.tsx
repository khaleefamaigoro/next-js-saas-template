import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PlanBadge({
  planKey,
  label,
  className,
}: {
  planKey: string;
  label: string;
  className?: string;
}) {
  const tone =
    planKey === "enterprise"
      ? "border-violet-500/30 bg-violet-500/10 text-violet-800 dark:text-violet-300"
      : planKey === "pro"
        ? "border-sky-500/30 bg-sky-500/10 text-sky-800 dark:text-sky-300"
        : planKey === "trial"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
          : "border-border bg-muted text-foreground";

  return (
    <Badge variant="outline" className={cn("uppercase tracking-wide text-[10px] font-semibold", tone, className)}>
      {label}
    </Badge>
  );
}

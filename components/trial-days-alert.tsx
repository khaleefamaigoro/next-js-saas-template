import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrialDaysAlert({ daysRemaining }: { daysRemaining: number }) {
  const expired = daysRemaining < 0;
  const today = daysRemaining === 0;

  const badge = expired
    ? "Expired"
    : today
      ? "Ends today"
      : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`;

  const message = expired
    ? "Your trial period has ended. Please upgrade your account to restore access."
    : today
      ? "Your trial period ends today. Please upgrade your account to keep access."
      : `You have only ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left for your trial period. Please upgrade account today!`;

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3 rounded-full border px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between",
        expired
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border-accent bg-accent text-accent-foreground"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold",
            expired
              ? "bg-destructive-foreground text-destructive"
              : "bg-warning text-warning-foreground"
          )}
        >
          {badge}
        </span>
        <p className="text-sm">{message}</p>
      </div>
      <Link
        href="/admin/billing"
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 text-sm font-medium underline underline-offset-4",
          expired ? "text-destructive-foreground" : "text-accent-foreground"
        )}
      >
        Upgrade Plan
        <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}

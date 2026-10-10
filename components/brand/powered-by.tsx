import { POWERED_BY_LOGO_URL, POWERED_BY_NAME } from "@/lib/branding";
import { cn } from "@/lib/utils";

type PoweredByProps = {
  className?: string;
  labelClassName?: string;
};

export function PoweredBy({ className, labelClassName }: PoweredByProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <p className="mb-2 flex gap-3 text-[11px] text-muted-foreground">
        <a href="/terms" className="hover:underline">Terms</a>
        <a href="/privacy" className="hover:underline">Privacy</a>
        <a href="/status" className="hover:underline">Status</a>
      </p>
      <p className={cn("text-[15px] font-semibold mb-2 text-center", labelClassName)}>
        ******
      </p>
      {POWERED_BY_LOGO_URL ? (
        <img
          src={POWERED_BY_LOGO_URL}
          alt={POWERED_BY_NAME}
          className="h-6 w-auto object-contain"
        />
      ) : (
        <span className="font-medium text-sm tracking-tight">{POWERED_BY_NAME}</span>
      )}
    </div>
  );
}

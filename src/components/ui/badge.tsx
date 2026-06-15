import { cn } from "@/lib/utils";

const tones = {
  neutral: "bg-ink-100 text-ink-700",
  teal: "bg-clinic-100 text-clinic-800",
  sand: "bg-sand-200 text-ink-800",
  amber: "bg-amber-100 text-amber-900",
  red: "bg-red-100 text-red-800",
  ink: "bg-ink-900 text-white",
};

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

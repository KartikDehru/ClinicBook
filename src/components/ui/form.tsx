import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "block w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-300 focus:border-clinic-600 focus:outline-none focus:ring-1 focus:ring-clinic-600 disabled:bg-ink-50";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-ink-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-400">{hint}</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(inputClass, className)} {...props} />
);
Input.displayName = "Input";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(inputClass, className)} {...props} />
);
Select.displayName = "Select";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn(inputClass, className)} {...props} />
);
Textarea.displayName = "Textarea";

export function Alert({
  tone = "error",
  children,
  className,
}: {
  tone?: "error" | "info" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-900",
    info: "border-sand-300 bg-sand-100 text-ink-800",
    success: "border-clinic-200 bg-clinic-50 text-clinic-900",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-md border px-3 py-2 text-sm", tones[tone], className)}>
      {children}
    </div>
  );
}

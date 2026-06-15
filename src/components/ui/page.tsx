import * as React from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight text-ink-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-ink-200 bg-white px-6 py-12 text-center">
      <p className="font-display text-lg font-semibold text-ink-900">{title}</p>
      {body && <p className="max-w-sm text-sm text-ink-500">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-ink-100 bg-white px-5 py-4 shadow-panel">
      <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-ink-900">{value}</p>
      {note && <p className="mt-1 text-xs text-ink-500">{note}</p>}
    </div>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

type Block = { day: number; start: number; len: number; label: string; tone: "teal" | "sand" | "ink" };

const BLOCKS: Block[] = [
  { day: 0, start: 1, len: 2, label: "Annual physical", tone: "teal" },
  { day: 0, start: 4, len: 1, label: "Vaccination", tone: "sand" },
  { day: 1, start: 0, len: 1, label: "Follow-up", tone: "sand" },
  { day: 1, start: 2, len: 2, label: "Skin check", tone: "teal" },
  { day: 2, start: 3, len: 1, label: "Lab draw", tone: "sand" },
  { day: 2, start: 5, len: 2, label: "Consult", tone: "teal" },
  { day: 3, start: 1, len: 1, label: "Follow-up", tone: "ink" },
  { day: 3, start: 4, len: 2, label: "Annual physical", tone: "teal" },
  { day: 4, start: 0, len: 2, label: "Dermatology", tone: "teal" },
  { day: 4, start: 3, len: 1, label: "Vaccination", tone: "sand" },
];

const TONES = {
  teal: "bg-clinic-700 text-white",
  sand: "bg-sand-200 text-ink-800",
  ink: "bg-ink-800 text-white",
};

/** Static illustration of the staff week calendar for the marketing page. */
export function WeekPreview() {
  const rows = 7;
  const rowH = 44;
  return (
    <div className="overflow-hidden rounded-lg border border-ink-200 bg-white shadow-panel" aria-hidden>
      <div className="grid grid-cols-[48px_repeat(5,1fr)] border-b border-ink-100 bg-ink-50 text-xs font-bold text-ink-500">
        <div />
        {DAYS.map((d, i) => (
          <div key={d} className="px-3 py-2">
            {d} <span className="font-medium text-ink-400">{8 + i}</span>
          </div>
        ))}
      </div>
      <div className="relative grid grid-cols-[48px_repeat(5,1fr)]" style={{ height: rows * rowH }}>
        <div className="text-[11px] font-semibold text-ink-400">
          {Array.from({ length: rows }, (_, i) => (
            <div key={i} style={{ height: rowH }} className="pr-2 pt-1 text-right">
              {8 + i}:00
            </div>
          ))}
        </div>
        {DAYS.map((d, di) => (
          <div key={d} className="relative border-l border-ink-100">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} style={{ height: rowH }} className="border-t border-ink-100" />
            ))}
            {BLOCKS.filter((b) => b.day === di).map((b) => (
              <div
                key={b.label + b.start}
                className={`absolute inset-x-1 rounded px-2 py-1 text-[11px] font-bold leading-tight ${TONES[b.tone]}`}
                style={{ top: b.start * rowH + 2, height: b.len * rowH - 4 }}
              >
                {b.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export interface LayoutEvent {
  id: string;
  startMin: number;
  endMin: number;
}

export interface PositionedEvent<T extends LayoutEvent> {
  event: T;
  /** zero-based column within its overlap cluster */
  column: number;
  columns: number;
}

/** Side-by-side layout for overlapping events within one day column. */
export function layoutDayEvents<T extends LayoutEvent>(events: T[]): PositionedEvent<T>[] {
  const sorted = [...events].sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);
  const result: PositionedEvent<T>[] = [];
  let cluster: { event: T; column: number }[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns = cluster.reduce((max, c) => Math.max(max, c.column + 1), 1);
    for (const c of cluster) result.push({ event: c.event, column: c.column, columns });
    cluster = [];
  };

  for (const ev of sorted) {
    if (cluster.length > 0 && ev.startMin >= clusterEnd) {
      flush();
      clusterEnd = -1;
    }
    const taken = new Set(
      cluster.filter((c) => c.event.endMin > ev.startMin).map((c) => c.column)
    );
    let column = 0;
    while (taken.has(column)) column++;
    cluster.push({ event: ev, column });
    clusterEnd = Math.max(clusterEnd, ev.endMin);
  }
  if (cluster.length) flush();
  return result;
}

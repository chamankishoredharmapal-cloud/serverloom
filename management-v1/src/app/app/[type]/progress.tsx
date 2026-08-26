export default function MaterialProgress({ made, capacity, remaining, startedOn }: {
  made: number; capacity: number; remaining: number; startedOn: string;
}) {
  const pct = capacity > 0 ? Math.min(100, Math.round((made / capacity) * 100)) : 100;
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
      <div>Started {startedOn} · Capacity {capacity} sarees</div>
      <div style={{ fontSize: 30, fontWeight: 700 }}>{made} made · {remaining} remaining</div>
      <div style={{ background: "#e5e7eb", borderRadius: 6, height: 12, marginTop: 8 }}>
        <div style={{ width: `${pct}%`, background: "#111", height: 12, borderRadius: 6 }} />
      </div>
    </div>
  );
}

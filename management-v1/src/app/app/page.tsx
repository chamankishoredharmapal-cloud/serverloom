import { currentIdentity } from "@/lib/auth";
import { currentWeekFor } from "@/lib/services/payrollService";

// Worker dashboard (FR-006): week range, pieces, rate, advance, final — precomputed.
export default async function WorkerDashboard() {
  const me = await currentIdentity();
  const wk = await currentWeekFor(me!.id);
  return (
    <section>
      <h2>My week {wk.monday} → {wk.sunday}</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Card label="Pieces this week" value={wk.pieces} />
        <Card label="Rate / piece" value={`₹${wk.rate}`} />
        <Card label="Advance balance" value={`₹${wk.advance}`} />
        <Card label="Final pay" value={`₹${wk.final_pay}`}
          hint={wk.final_pay < 0 ? "Negative = advance exceeds earnings (recovering)" : undefined} />
      </div>
    </section>
  );
}

function Card({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, color: "#a60" }}>{hint}</div>}
    </div>
  );
}

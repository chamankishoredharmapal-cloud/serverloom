import { currentIdentity } from "@/lib/auth";
import { listMine } from "@/lib/services/productionService";
import { currentWeekFor } from "@/lib/services/payrollService";

// Own production history (FR-007): rows + display earnings at CURRENT rate (CALC-008).
export default async function MyProduction() {
  const me = await currentIdentity();
  const [rows, wk] = await Promise.all([listMine(me!.id), currentWeekFor(me!.id)]);
  return (
    <section>
      <h2>My production</h2>
      {rows.length === 0 ? (
        <p>No entries yet — your administrator records daily output.</p>
      ) : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th align="left">Date</th><th align="right">Pieces</th><th align="right">Earnings (₹ @ ₹{wk.rate})</th><th align="left">Note</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{r.work_date}</td><td align="right">{r.count}</td>
                <td align="right">{r.count * wk.rate}</td><td>{r.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

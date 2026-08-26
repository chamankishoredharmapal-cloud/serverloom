import { currentIdentity } from "@/lib/auth";
import { ledgerMine } from "@/lib/services/settlementService";

// Own salary ledger (FR-011) — SNAPSHOT authority rows with empty state.
export default async function MySalary() {
  const me = await currentIdentity();
  const rows = await ledgerMine(me!.id);
  return (
    <section>
      <h2>My salary history</h2>
      {rows.length === 0 ? <p>No settled weeks yet.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th>Week</th><th align="right">Pieces</th><th align="right">Rate</th><th align="right">Gross</th>
            <th align="right">Advance</th><th align="right">Final</th><th>Paid</th><th>Paid on</th><th>Note</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td>{String(r.week_start)} → {String(r.week_end)}</td>
                <td align="right">{r.pieces}</td><td align="right">{r.rate}</td>
                <td align="right">{r.gross}</td><td align="right">{r.advance_applied}</td>
                <td align="right" style={{ color: r.final_pay < 0 ? "#a60" : undefined }}>{r.final_pay}</td>
                <td>{r.paid ? "Yes" : "No"}</td><td>{r.paid_on ?? "—"}</td>
                <td>{r.settlement_note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

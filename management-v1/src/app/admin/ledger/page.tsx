import { ledgerAll } from "@/lib/services/settlementService";

// Admin salary ledger table (FR-029 / REP-002a) — SNAPSHOT values as stored.
export default async function AdminLedger() {
  const rows = await ledgerAll();
  return (
    <section>
      <h2>Salary history (all weeks)</h2>
      {rows.length === 0 ? <p>No archived or settled weeks yet.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th>Worker</th><th>Week</th><th align="right">Pieces</th><th align="right">Rate</th>
            <th align="right">Gross</th><th align="right">Advance</th><th align="right">Final</th>
            <th>Paid</th><th>Paid on</th><th>Canonical</th><th>Source</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td>{r.full_name}</td>
              <td>{String(r.week_start)} → {String(r.week_end)}</td>
              <td align="right">{r.pieces}</td><td align="right">{r.rate}</td>
              <td align="right">{r.gross}</td><td align="right">{r.advance_applied}</td>
              <td align="right" style={{ color: r.final_pay < 0 ? "#a60" : undefined }}>{r.final_pay}</td>
              <td>{r.paid ? "Yes" : "No"}</td><td>{r.paid_on ?? "—"}</td>
              <td>{r.canonical ? "✔" : ""}</td><td>{r.source}</td>
            </tr>))}
          </tbody>
        </table>
      )}
    </section>
  );
}

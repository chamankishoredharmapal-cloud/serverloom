import { weekGrid } from "@/lib/services/payrollService";
import {
  giveAdvanceAction, clearAdvanceAction,
  markPaidAction, markUnpaidAction,
} from "@/lib/actions/adminActions";

// Weekly salary grid (FR-021): precomputed rows; payment + advance actions.
export default async function WeeklySalary({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const { rows, monday, sunday } = await weekGrid();
  return (
    <section>
      <h2>Weekly salary — {monday} → {sunday}</h2>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}
      {rows.length === 0 ? <p>No active workers yet.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th>Worker</th><th align="right">Pieces</th><th align="right">Gross</th>
            <th align="right">Advance</th><th align="right">Final</th><th>Paid</th>
            <th>Payment</th><th>Advance ops</th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.worker_id}>
              <td>{r.full_name}</td>
              <td align="right">{r.pieces}</td>
              <td align="right">{r.gross}</td>
              <td align="right">{r.advance}</td>
              <td align="right" style={{ color: r.final_pay < 0 ? "#a60" : undefined }}>{r.final_pay}</td>
              <td>{r.paid ? "✅ Paid" : "—"}</td>
              <td style={{ display: "flex", gap: 6 }}>
                {!r.paid ? (
                  <form action={markPaidAction}>
                    <input type="hidden" name="workerId" value={r.worker_id} />
                    <button type="submit">Mark paid</button>
                  </form>
                ) : (
                  <form action={markUnpaidAction}>
                    <input type="hidden" name="workerId" value={r.worker_id} />
                    <button type="submit">Mark unpaid</button>
                  </form>
                )}
              </td>
              <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <form action={giveAdvanceAction} style={{ display: "flex", gap: 4 }}>
                  <input type="hidden" name="workerId" value={r.worker_id} />
                  <input name="amount" type="number" min={1} placeholder="₹" style={{ width: 70 }} required />
                  <button type="submit">Give</button>
                </form>
                <form action={clearAdvanceAction}>
                  <input type="hidden" name="workerId" value={r.worker_id} />
                  <button type="submit">Clear</button>
                </form>
              </td>
            </tr>))}
          </tbody>
        </table>
      )}
    </section>
  );
}

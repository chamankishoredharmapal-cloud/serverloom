import { notFound } from "next/navigation";
import { getWorker } from "@/lib/services/workerService";
import { removeEntryAction, addEntryAction, setRateAction, setStatusAction } from "@/lib/actions/adminActions";
import { currentWeekFor } from "@/lib/services/payrollService";
import { advanceHistoryFor } from "@/lib/services/advanceService";
import { weekEntriesFor } from "@/lib/services/productionService";

// Worker detail console (FR-014): rate setting, entries (+corrections), lifecycle.
export default async function WorkerDetail({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  let w;
  try { w = await getWorker(id); } catch { notFound(); }
  const wk = await currentWeekFor(id);
  const [entries, advHist] = await Promise.all([
    weekEntriesFor(id, wk.monday, wk.sunday),
    advanceHistoryFor(id),
  ]);
  void setStatusAction;

  return (
    <section>
      <h2>{w.full_name} <small>({w.status})</small></h2>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}

      <h3>This week</h3>
      <p>Pieces {wk.pieces} × ₹{wk.rate} = ₹{wk.gross}; advance ₹{wk.advance};
         final <b>₹{wk.final_pay}</b></p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <h4>Set rate (₹ per saree)</h4>
          <form action={setRateAction} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="workerId" value={id} />
            <input name="rate" type="number" min={0} defaultValue={w.salary_rate} />
            <button type="submit">Save</button>
          </form>

          <h4>Lifecycle</h4>
          <form action={setStatusAction} style={{ display: "flex", gap: 8 }}>
            <input type="hidden" name="workerId" value={id} />
            <select name="status" defaultValue={w.status}>
              {["PENDING","ACTIVE","INACTIVE","SUSPENDED"].map(s => <option key={s}>{s}</option>)}
            </select>
            <button type="submit">Apply</button>
          </form>

          <h4>Add production entry</h4>
          <form action={addEntryAction} style={{ display: "grid", gap: 6 }}>
            <input type="hidden" name="workerId" value={id} />
            <input name="workDate" type="date" placeholder="Blank = today" />
            <input name="count" type="number" min={0} placeholder="Count" required />
            <input name="note" placeholder="Note (optional)" />
            <button type="submit">Add entry</button>
          </form>
        </div>

        <div>
          <h4>This week&apos;s entries</h4>
          {entries.length === 0 ? <p>None.</p> : (
            <table cellPadding={5} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
              <tbody>{entries.map(e => (
                <tr key={e.id}>
                  <td>{String(e.work_date)}</td><td align="right">{e.count}</td>
                  <td>
                    <form action={removeEntryAction}>
                      <input type="hidden" name="workerId" value={id} />
                      <input type="hidden" name="entryId" value={e.id} />
                      <button type="submit">Delete</button>
                    </form>
                  </td>
                </tr>))}
              </tbody>
            </table>
          )}

          <h4>Advance trail (audited)</h4>
          {advHist.length === 0 ? <p>Empty.</p> : (
            <ul style={{ fontSize: 13 }}>
              {advHist.slice(0, 8).map((a, i) => (
                <li key={i}>{a.action}: {a.previous_amount} → {a.new_amount}
                   <small> · {new Date(a.created_at).toLocaleString()} · {a.note}</small></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

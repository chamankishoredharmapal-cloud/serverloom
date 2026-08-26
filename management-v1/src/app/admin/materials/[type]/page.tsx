import { listAll } from "@/lib/services/materialService";
import { assignMaterialAction, finishMaterialAction } from "@/lib/actions/adminActions";
import { searchWorkers } from "@/lib/services/workerService";

// Material admin pages (FR-017..FR-020): assign form + list with progress + finish.
export default async function MaterialsPage({
  params, searchParams,
}: { params: Promise<{ type: string }>; searchParams: Promise<{ error?: string }> }) {
  const { type: raw } = await params;
  const sp = await searchParams;
  const type = raw.toUpperCase() === "WARP" ? "WARP" : "PAGDI";
  const [rows, actives] = await Promise.all([
    listAll(type as "PAGDI" | "WARP"),
    searchWorkers(""),
  ]);
  const eligible = actives.filter(w => w.status === "ACTIVE");

  return (
    <section>
      <h2>{type[0] + type.slice(1).toLowerCase()} assignments</h2>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}

      <h3>Assign new</h3>
      <form action={assignMaterialAction} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="hidden" name="materialType" value={type} />
        <select name="workerId" required defaultValue="">
          <option value="" disabled>Choose worker…</option>
          {eligible.map(w => <option key={w.id} value={w.id}>{w.full_name} ({w.phone})</option>)}
        </select>
        {type === "PAGDI" && <input name="startedOn" type="date" required />}
        {type === "WARP" && <small>Start = today (fixed)</small>}
        <input name="capacity" type="number" min={0} placeholder="Capacity" style={{ width: 110 }} />
        <button type="submit">Assign</button>
      </form>

      <h3 style={{ marginTop: 24 }}>All assignments</h3>
      {rows.length === 0 ? <p>None yet.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr>
            <th>Worker</th><th>Start</th><th>End</th><th align="right">Capacity</th>
            <th align="right">Made</th><th align="right">Remaining</th><th>Status</th><th></th>
          </tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.id}>
              <td>{r.full_name}</td><td>{String(r.started_on)}</td>
              <td>{r.finished_on ? String(r.finished_on) : "—"}</td>
              <td align="right">{r.capacity}</td><td align="right">{r.pieces}</td>
              <td align="right">{Math.max(0, r.capacity - r.pieces)}</td>
              <td>{r.finished_on ? "Finished" : "🟢 Active"}</td>
              <td>
                {!r.finished_on && (
                  <form action={finishMaterialAction}>
                    <input type="hidden" name="assignmentId" value={r.id} />
                    <input type="hidden" name="materialType" value={type} />
                    <button type="submit">Finish</button>
                  </form>
                )}
              </td>
            </tr>))}
          </tbody>
        </table>
      )}
    </section>
  );
}

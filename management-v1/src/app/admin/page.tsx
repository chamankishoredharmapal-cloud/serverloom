import { searchWorkers, pendingCount, activeCounts } from "@/lib/services/workerService";
import { recentRuns, runWeek } from "@/lib/services/archiveService";
import { runArchiveAction } from "@/lib/actions/adminActions";

// Admin home (FR-012 stats + F-30 archive console with dry-run ritual).
export default async function AdminHome({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  const [workers, pending, counts, runs] = await Promise.all([
    searchWorkers(""), pendingCount(), activeCounts(), recentRuns(5),
  ]);
  return (
    <section>
      <h2>Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <Stat label="Total workers" value={workers.length} />
        <Stat label="Pending approval" value={pending} />
        <Stat label="Active pagdis" value={counts.pagdis} />
        <Stat label="Active warps" value={counts.warps} />
      </div>

      <h3 style={{ marginTop: 28 }}>Weekly archive</h3>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}
      <form action={runArchiveAction} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <input name="note" placeholder="Note (optional)" />
        <label><input type="checkbox" name="dryRun" /> Dry-run (predict only)</label>
        <button type="submit">Run for current week</button>
      </form>
      <p style={{ fontSize: 12, color: "#666" }}>
        Archive is the sole writer of weekly quantity columns; reruns are idempotent.
      </p>

      <h3 style={{ marginTop: 28 }}>Recent runs</h3>
      {runs.length === 0 ? <p>No archive has run yet.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse" }}>
          <thead><tr><th>Window</th><th>By</th><th align="right">Created</th><th align="right">Refreshed</th><th>When</th></tr></thead>
          <tbody>{runs.map(r => (
            <tr key={r.id}>
              <td>{String(r.week_start)} → {String(r.week_end)}</td>
              <td>{r.triggered_by}</td><td align="right">{r.rows_created}</td>
              <td align="right">{r.rows_refreshed}</td><td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

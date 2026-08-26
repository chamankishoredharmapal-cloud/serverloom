import { currentIdentity } from "@/lib/auth";
import { activeFor, historyFor } from "@/lib/services/materialService";
import MaterialProgress from "./progress";

// Own material page (FR-008/FR-009): ACTIVE progress + full history.
export default async function MyMaterial({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const t = type.toUpperCase() === "WARP" ? "WARP" : "PAGDI";
  const me = await currentIdentity();
  const [active, history] = await Promise.all([
    activeFor(me!.id, t as "PAGDI" | "WARP"),
    historyFor(me!.id, t as "PAGDI" | "WARP"),
  ]);
  return (
    <section>
      <h2>My {t.toLowerCase()} work</h2>
      {active ? (
        <MaterialProgress made={active.pieces} capacity={active.capacity} remaining={active.remaining}
          startedOn={String(active.started_on)} />
      ) : (
        <p>No active assignment. Check back after your administrator assigns one.</p>
      )}
      <h3 style={{ marginTop: 28 }}>History</h3>
      {history.length === 0 ? <p>Empty.</p> : (
        <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
          <thead><tr><th>Start</th><th>End</th><th align="right">Capacity</th><th align="right">Made</th><th align="right">Remaining</th><th>Status</th></tr></thead>
          <tbody>
            {history.map(h => (
              <tr key={h.id}>
                <td>{String(h.started_on)}</td><td>{h.finished_on ? String(h.finished_on) : "—"}</td>
                <td align="right">{h.capacity}</td><td align="right">{h.pieces}</td>
                <td align="right">{Math.max(0, h.capacity - h.pieces)}</td>
                <td>{h.finished_on ? "Finished" : "Active"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

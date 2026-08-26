import Link from "next/link";
import { currentIdentity } from "@/lib/auth";
import { historyFor } from "@/lib/services/materialService";
import { listMine } from "@/lib/services/productionService";

// Combined personal history (FR-010 / REP-007).
export default async function MyHistory() {
  const me = await currentIdentity();
  const [prod, pagdi, warp] = await Promise.all([
    listMine(me!.id),
    historyFor(me!.id, "PAGDI"),
    historyFor(me!.id, "WARP"),
  ]);
  return (
    <section>
      <h2>My combined history</h2>
      <h3>Production ({prod.length}) — see <Link href="/app/production">detail page</Link></h3>
      <h3>Pagdi assignments ({pagdi.length})</h3>
      <MiniTable rows={pagdi} />
      <h3>Warp assignments ({warp.length})</h3>
      <MiniTable rows={warp} />
    </section>
  );
}

function MiniTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  if (rows.length === 0) return <p>Empty.</p>;
  return (
    <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
      <thead><tr><th>Type</th><th>Start</th><th>End</th><th align="right">Capacity</th><th align="right">Made</th></tr></thead>
      <tbody>{rows.map(r => (
        <tr key={String(r.id)}>
          <td>{String(r.material_type)}</td><td>{String(r.started_on)}</td>
          <td>{r.finished_on ? String(r.finished_on) : "Active"}</td>
          <td align="right">{String(r.capacity)}</td><td align="right">{String(r.pieces)}</td>
        </tr>))}
      </tbody>
    </table>
  );
}

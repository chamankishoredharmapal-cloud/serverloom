import { query } from "@/lib/db";
import { currentIdentity } from "@/lib/auth";
import { redirect } from "next/navigation";

// Audit viewer (superadmin-only read surface; Phase 7 ownership map).
export default async function AuditPage({ searchParams }: { searchParams: Promise<{ entity?: string }> }) {
  const me = await currentIdentity();
  if (me?.role !== "SUPERADMIN") redirect("/admin");
  const sp = await searchParams;
  const rows = await query(
    `select occurred_at, actor_kind, actor_name, entity_type, entity_id, action, before, after, note
       from audit_events
      where ($1::text is null or entity_type = $1)
      order by occurred_at desc limit 200`,
    [sp.entity ?? null]
  ).then(r => r.rows);
  return (
    <section>
      <h2>Audit trail (latest 200)</h2>
      <form><input name="entity" placeholder="Filter entity_type e.g. ADVANCE" defaultValue={sp.entity ?? ""} />
        <button>Filter</button></form>
      <table cellPadding={5} style={{ background: "#fff", borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead><tr><th>When</th><th>Actor</th><th>Entity</th><th>Action</th><th>Before → After</th><th>Note</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>
            <td>{new Date(r.occurred_at).toLocaleString()}</td>
            <td>{r.actor_kind === "SYSTEM" ? "⚙ system" : r.actor_name}</td>
            <td>{r.entity_type}</td><td>{r.action}</td>
            <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}>
              {JSON.stringify(r.before)} → {JSON.stringify(r.after)}
            </td>
            <td>{r.note}</td>
          </tr>))}
        </tbody>
      </table>
    </section>
  );
}

import Link from "next/link";
import { searchWorkers } from "@/lib/services/workerService";
import { approveWorkerAction } from "@/lib/actions/adminActions";

// Workers list + the single search filter (FR-013) + approve action (FR-004).
export default async function WorkersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const sp = await searchParams;
  const rows = await searchWorkers(sp.q ?? "");
  return (
    <section>
      <h2>Workers</h2>
      <form style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or phone" />
        <button type="submit">Search</button>
      </form>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}
      <table cellPadding={6} style={{ background: "#fff", borderCollapse: "collapse", width: "100%" }}>
        <thead><tr>
          <th>Name</th><th>Phone</th><th>Status</th><th align="right">Rate</th><th></th>
        </tr></thead>
        <tbody>{rows.map(w => (
          <tr key={w.id}>
            <td><Link href={`/admin/workers/${w.id}`}>{w.full_name}</Link></td>
            <td>{w.phone}</td>
            <td>{w.status}</td>
            <td align="right">₹{w.salary_rate}</td>
            <td>
              {w.status === "PENDING" && (
                <form action={approveWorkerAction}>
                  <input type="hidden" name="workerId" value={w.id} />
                  <button type="submit">Approve</button>
                </form>
              )}
            </td>
          </tr>))}
        </tbody>
      </table>
    </section>
  );
}

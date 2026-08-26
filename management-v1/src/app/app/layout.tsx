import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/authActions";

export default async function WorkerLayout({ children }: { children: React.ReactNode }) {
  const id = await currentIdentity();
  if (!id) redirect("/login");
  if (id.role !== "WORKER") redirect("/admin");
  return (
    <>
      <nav style={{ display: "flex", gap: 16, padding: "12px 20px", background: "#111", color: "#eee", flexWrap: "wrap" }}>
        <a href="/app" style={{ color: "#fff" }}>Dashboard</a>
        <a href="/app/production" style={{ color: "#fff" }}>Production</a>
        <a href="/app/pagdi" style={{ color: "#fff" }}>Pagdi</a>
        <a href="/app/warp" style={{ color: "#fff" }}>Warp</a>
        <a href="/app/history" style={{ color: "#fff" }}>History</a>
        <a href="/app/salary" style={{ color: "#fff" }}>Salary ledger</a>
        <form action={logoutAction} style={{ marginLeft: "auto" }}>
          <button type="submit">Logout ({id.fullName})</button>
        </form>
      </nav>
      <main style={{ maxWidth: 860, margin: "24px auto", padding: "0 16px" }}>{children}</main>
    </>
  );
}

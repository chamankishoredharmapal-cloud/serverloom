import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/auth";
import { logoutAction } from "@/lib/actions/authActions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const id = await currentIdentity();
  if (!id) redirect("/login");
  if (id.role !== "STAFF" && id.role !== "SUPERADMIN") redirect("/app");
  return (
    <>
      <nav style={{ display: "flex", gap: 14, padding: "12px 20px", background: "#111827", color: "#eee", flexWrap: "wrap" }}>
        <a href="/admin" style={{ color: "#fff" }}>Home</a>
        <a href="/admin/workers" style={{ color: "#fff" }}>Workers</a>
        <a href="/admin/weekly" style={{ color: "#fff" }}>Weekly salary</a>
        <a href="/admin/materials/pagdi" style={{ color: "#fff" }}>Pagdi</a>
        <a href="/admin/materials/warp" style={{ color: "#fff" }}>Warp</a>
        <a href="/admin/ledger" style={{ color: "#fff" }}>Salary history</a>
        {id.role === "SUPERADMIN" && <a href="/admin/audit" style={{ color: "#fff" }}>Audit</a>}
        <a href="/api/export/global-history" style={{ color: "#9cf" }}>Export XLSX</a>
        {id.role === "SUPERADMIN" && (
          <form action={logoutAction} style={{ marginLeft: "auto" }}>
            <button type="submit">Logout ({id.fullName})</button>
          </form>
        )}
      </nav>
      <main style={{ maxWidth: 1020, margin: "24px auto", padding: "0 16px" }}>{children}</main>
    </>
  );
}

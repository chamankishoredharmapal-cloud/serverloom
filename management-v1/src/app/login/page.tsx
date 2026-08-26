import { loginAction, signupAction } from "@/lib/actions/authActions";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ error?: string; pending?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: 24, background: "#fff", borderRadius: 12 }}>
      <h1>Sign in</h1>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}
      {sp.pending && <p style={{ color: "#070" }}>Account created — waiting for admin approval.</p>}
      <form action={loginAction} style={{ display: "grid", gap: 10 }}>
        <input name="phone" placeholder="Phone" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
      </form>
      <p style={{ marginTop: 16 }}>
        No account? <a href="/signup">Sign up</a> (approval required before first login)
      </p>
    </main>
  );
}

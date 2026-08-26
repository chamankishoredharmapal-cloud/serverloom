import { signupAction } from "@/lib/actions/authActions";

export default async function SignupPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const sp = await searchParams;
  return (
    <main style={{ maxWidth: 380, margin: "80px auto", padding: 24, background: "#fff", borderRadius: 12 }}>
      <h1>Create account</h1>
      <p>New accounts start PENDING — an administrator must approve before you can sign in.</p>
      {sp.error && <p style={{ color: "#b00" }}>{sp.error}</p>}
      <form action={signupAction} style={{ display: "grid", gap: 10 }}>
        <input name="fullName" placeholder="Full name" required />
        <input name="phone" placeholder="Phone" required maxLength={15} />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign up</button>
      </form>
      <p style={{ marginTop: 16 }}><a href="/login">Back to sign in</a></p>
    </main>
  );
}

import { redirect } from "next/navigation";
import { currentIdentity } from "@/lib/auth";

export default async function Home() {
  const id = await currentIdentity();
  if (!id) redirect("/login");
  redirect(id.role === "WORKER" ? "/app" : "/admin");
}

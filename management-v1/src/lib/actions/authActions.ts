"use server";
import { redirect } from "next/navigation";
import { safeMessage } from "@/lib/domain/errors";
import * as AuthService from "@/lib/services/authService";
import { issueSession, clearSession } from "@/lib/auth";

export async function signupAction(formData: FormData) {
  try {
    await AuthService.register(
      String(formData.get("fullName") ?? ""), String(formData.get("phone") ?? ""),
      String(formData.get("password") ?? "")
    );
    redirect("/login?pending=1");
  } catch (err) {
    const { message } = safeMessage(err);
    if (message === "NEXT_REDIRECT") throw err;
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }
}

export async function loginAction(formData: FormData) {
  let target = "/login";
  try {
    const id = await AuthService.login(
      String(formData.get("phone") ?? ""), String(formData.get("password") ?? "")
    );
    await issueSession(id);
    const who = await (await import("@/lib/auth")).currentIdentity();
    target = who?.role === "WORKER" ? "/app" : "/admin";
  } catch (err) {
    const { message } = safeMessage(err);
    target = `/login?error=${encodeURIComponent(message)}`;
  }
  redirect(target);
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

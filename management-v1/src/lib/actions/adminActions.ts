"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as W from "@/lib/services/workerService";
import * as P from "@/lib/services/payrollService";
import * as A from "@/lib/services/advanceService";
import * as M from "@/lib/services/materialService";
import * as S from "@/lib/services/settlementService";
import * as Prod from "@/lib/services/productionService";
import * as Arch from "@/lib/services/archiveService";
import { requireStaff } from "@/lib/auth";
import { safeMessage } from "@/lib/domain/errors";
import {
  ProductionEntryInput, RateInput, AdvanceGiveInput,
  MaterialAssignInput, CarryInput,
} from "@/lib/domain/validation";

function back(path: string, err?: unknown) {
  if (err) {
    const { message } = safeMessage(err);
    redirect(`${path}?error=${encodeURIComponent(message)}`);
  }
  redirect(path);
}

export async function approveWorkerAction(fd: FormData) {
  try { await requireStaff(); await W.approveWorker(String(fd.get("workerId"))); }
  catch (e) { return back("/admin/workers", e); }
  back("/admin/workers");
}

export async function setStatusAction(fd: FormData) {
  const id = String(fd.get("workerId"));
  try { await requireStaff(); await W.setStatus(id, String(fd.get("status"))); }
  catch (e) { return back(`/admin/workers/${id}`, e); }
  back(`/admin/workers/${id}`);
}

export async function setRateAction(fd: FormData) {
  const id = String(fd.get("workerId"));
  try {
    await requireStaff();
    const v = RateInput.parse({ workerId: id, salaryPerSaree: Number(fd.get("rate")) });
    await P.setRate(v.workerId, v.salaryPerSaree);
  } catch (e) { return back(`/admin/workers/${id}`, e); }
  back(`/admin/workers/${id}`);
}

export async function addEntryAction(fd: FormData) {
  const id = String(fd.get("workerId"));
  try {
    await requireStaff();
    const v = ProductionEntryInput.parse({
      workerId: id,
      workDate: fd.get("workDate") ? String(fd.get("workDate")) : undefined,
      count: Number(fd.get("count")), note: String(fd.get("note") ?? ""),
    });
    await Prod.createEntry(v.workerId, v.workDate, v.count, v.note);
  } catch (e) { return back(`/admin/workers/${id}`, e); }
  back(`/admin/workers/${id}`);
}

export async function removeEntryAction(fd: FormData) {
  const id = String(fd.get("workerId"));
  try { await requireStaff(); await Prod.removeEntry(String(fd.get("entryId"))); }
  catch (e) { return back(`/admin/workers/${id}`, e); }
  back(`/admin/workers/${id}`);
}

export async function giveAdvanceAction(fd: FormData) {
  const id = String(fd.get("workerId"));
  try {
    await requireStaff();
    const v = AdvanceGiveInput.parse({ workerId: id, amount: Number(fd.get("amount")) });
    await A.giveAdvance(v.workerId, v.amount);
  } catch (e) { return back("/admin/weekly", e); }
  back("/admin/weekly");
}

export async function clearAdvanceAction(fd: FormData) {
  try { await requireStaff(); await A.clearAdvance(String(fd.get("workerId"))); }
  catch (e) { return back("/admin/weekly", e); }
  back("/admin/weekly");
}

export async function markPaidAction(fd: FormData) {
  try { await requireStaff(); await S.markPaid(String(fd.get("workerId"))); }
  catch (e) { return back("/admin/weekly", e); }
  back("/admin/weekly");
}

export async function markUnpaidAction(fd: FormData) {
  try { await requireStaff(); await S.markUnpaid(String(fd.get("workerId"))); }
  catch (e) { return back("/admin/weekly", e); }
  back("/admin/weekly");
}

export async function assignMaterialAction(fd: FormData) {
  try {
    await requireStaff();
    const v = MaterialAssignInput.parse({
      workerId: String(fd.get("workerId")),
      materialType: String(fd.get("materialType")),
      startedOn: fd.get("startedOn") ? String(fd.get("startedOn")) : undefined,
      capacity: Number(fd.get("capacity")),
    });
    await M.assign(v);
  } catch (e) { return back(`/admin/materials/${String(fd.get("materialType")).toLowerCase()}`, e); }
  back(`/admin/materials/${String(fd.get("materialType")).toLowerCase()}`);
}

export async function finishMaterialAction(fd: FormData) {
  const t = String(fd.get("materialType")).toLowerCase();
  try { await requireStaff(); await M.finish(String(fd.get("assignmentId"))); }
  catch (e) { return back(`/admin/materials/${t}`, e); }
  back(`/admin/materials/${t}`);
}

export async function runArchiveAction(fd: FormData) {
  try {
    await requireStaff();
    await Arch.runWeek({
      dryRun: fd.get("dryRun") === "on",
      note: String(fd.get("note") ?? ""),
      triggeredBy: "OPERATOR",
    });
  } catch (e) { return back("/admin", e); }
  back("/admin");
}

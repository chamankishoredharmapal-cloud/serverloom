import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { currentIdentity } from "@/lib/auth";
import { query } from "@/lib/db";
import { weekBounds } from "@/lib/domain/week";

// Exports (Phase 6 REP-003/005/006): staff-only; streamed; authoritative data only.
// REP-005 Sheet 1 prices at CURRENT rate per CALC-008/D-08 default strategy.

function iso(d: Date) { const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }

export async function GET(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const me = await currentIdentity();
  if (!me || (me.role !== "STAFF" && me.role !== "SUPERADMIN")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const { kind } = await ctx.params;

  if (kind === "slip" ) {
    const workerId = new URL(req.url).searchParams.get("workerId") ?? "";
    return slip(workerId);
  }

  const wb = new ExcelJS.Workbook();

  if (kind === "global-history") {
    // REP-005: four sheets, exact ordering; sheet1 repriced live; sheet4 snapshot.
    const s1 = wb.addWorksheet("Saree History");
    s1.addRow(["Employee", "Date", "Count", "Notes", "Salary Earned"]).font = { bold: true };
    const prod = await query<{ full_name: string; work_date: string; count: number; note: string; rate: number }>(
      `select p.full_name, pe.work_date::text, pe.count, coalesce(pe.note,'') note,
              pr.salary_rate rate
         from production_entries pe
         join profiles p on p.id = pe.worker_id
         join profiles pr on pr.id = pe.worker_id
        order by pe.work_date desc`);
    for (const r of prod.rows) s1.addRow([r.full_name, r.work_date, r.count, r.note, r.count * r.rate]);

    const mats = await query(`select a.*, p.full_name from material_assignments a join profiles p on p.id=a.worker_id order by a.started_on desc`);
    for (const [name, t] of [["Pagdi History","PAGDI"],["Warp History","WARP"]] as const) {
      const ws = wb.addWorksheet(name);
      ws.addRow(["Employee", "Start", "End", "Capacity", "Notes"]).font = { bold: true };
      for (const m of mats.rows.filter(m2 => m2.material_type === t))
        ws.addRow([m.full_name, String(m.started_on), m.finished_on ? String(m.finished_on) : "Active", m.capacity, m.note ?? ""]);
    }

    const s4 = wb.addWorksheet("Salary History");
    s4.addRow(["Employee", "Week Start", "Week End", "Sarees", "Rate", "Advance", "Final", "Paid", "Notes"])
      .font = { bold: true };
    const led = await query(`select l.*, p.full_name from weekly_ledger l join profiles p on p.id=l.worker_id order by l.week_start desc`);
    for (const l of led.rows)
      s4.addRow([l.full_name, String(l.week_start), String(l.week_end), l.pieces, l.rate,
                 l.advance_applied, l.final_pay, l.paid ? "Yes" : "No", l.settlement_note ?? ""]);
    return xlsx(wb, "Global_History_Report.xlsx");
  }

  if (kind === "weekly-salary") {
    const ws = wb.addWorksheet("Salary History");
    ws.addRow(["Employee", "Week Start", "Week End", "Sarees", "Rate", "Advance", "Final", "Paid?", "Notes"])
      .font = { bold: true };
    const led = await query(`select l.*, p.full_name from weekly_ledger l join profiles p on p.id=l.worker_id order by l.week_start desc`);
    for (const l of led.rows)
      ws.addRow([l.full_name, String(l.week_start), String(l.week_end), l.pieces, l.rate,
                 l.advance_applied, l.final_pay, l.paid ? "Yes" : "No", l.settlement_note ?? ""]);
    return xlsx(wb, "Global_Weekly_Salary.xlsx");
  }

  return NextResponse.json({ error: "unknown export" }, { status: 404 });
}

function xlsx(wb: ExcelJS.Workbook, filename: string) {
  return wb.xlsx.writeBuffer().then((buf) =>
    new NextResponse(Buffer.from(buf as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  );
}

async function slip(workerId: string): Promise<NextResponse> {
  const w = await query(
    `with wk as (
       select coalesce(sum(count),0)::int pieces from production_entries
        where worker_id=$1 and work_date between $2 and $3)
     select full_name, salary_rate rate, wk.pieces, advance_balance adv,
            (wk.pieces*salary_rate)-advance_balance final_pay
       from profiles cross join wk where id=$1`, 
    [workerId, iso(weekBounds(new Date()).monday), iso(weekBounds(new Date()).sunday)]
  );
  const r = w.rows[0];
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const { monday, sunday } = weekBounds(new Date());
  const lines = [
    `Salary Slip - ${r.full_name}`,
    `Week: ${iso(monday)} to ${iso(sunday)}`,
    ``,
    `Pieces: ${r.pieces}   Rate: Rs.${r.rate}`,
    `Advance balance: Rs.${r.adv}`,
    `Final Salary: Rs.${r.final_pay}`,
  ];
  lines.forEach((t, i) => page.drawText(t, { x: 60, y: 780 - i * 24, size: 14, font }));
  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="salary_slip_${encodeURIComponent(r.full_name)}.pdf"`,
    },
  });
}

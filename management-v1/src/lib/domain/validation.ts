// Shared input contracts (Phase 6 VALIDATION_RULES VAL-001..011 → Zod at every boundary).
import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Invalid date");

export const SignupInput = z.object({
  fullName: z.string().trim().min(1, "All fields are required."),
  phone: z.string().trim().min(1, "All fields are required.").max(15),
  password: z.string().min(1, "All fields are required."), // strength policy = D-10 default at edge
});

export const LoginInput = z.object({
  phone: z.string().trim().min(1),
  password: z.string().min(1),
});

export const ProductionEntryInput = z.object({
  workerId: z.string().uuid("Please choose a valid worker."),
  workDate: isoDate.optional(), // blank → today handled by caller per VAL-003
  count: z.number().int("Invalid count").min(0, "Count cannot be negative."),
  note: z.string().max(2000).optional(),
});

export const RateInput = z.object({
  workerId: z.string().uuid(),
  salaryPerSaree: z.number().int("Invalid salary value.").min(0, "Negative not allowed"),
});

export const AdvanceGiveInput = z.object({
  workerId: z.string().uuid(),
  amount: z.number().int("Invalid amount").positive("amount must be a positive integer"),
  note: z.string().max(500).optional(),
});

export const MaterialAssignInput = z
  .object({
    workerId: z.string().uuid("Please choose a valid worker."),
    materialType: z.enum(["PAGDI", "WARP"]),
    startedOn: isoDate.optional(), // WARP forces today (BR-028); PAGDI requires it — enforced below
    capacity: z.number().int("Invalid capacity value.").min(0, "Capacity cannot be negative."),
    note: z.string().max(2000).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.materialType === "PAGDI" && !v.startedOn) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startedOn"], message: "Start date is required." });
    }
  });

export const FinishMaterialInput = z.object({ assignmentId: z.string().uuid() });

export const MarkPaidInput = z.object({
  workerId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

export const CarryInput = z.object({
  factorNum: z.number().int().min(0, "carry_factor must be non-negative"),
  factorDen: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export type MaterialType = "PAGDI" | "WARP";

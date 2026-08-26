// Domain error taxonomy (Phase 7 SERVICE_BOUNDARIES common contract).
// Every user-facing failure maps to ONE of these; raw DB/driver errors never escape.

export type DomainErrorKind =
  | "ValidationError"
  | "AuthError"
  | "AuthzError"
  | "DuplicateError"
  | "NotFound"
  | "Conflict";

export class DomainError extends Error {
  constructor(
    public readonly kind: DomainErrorKind,
    message: string,
    public readonly httpStatus: number = 400
  ) {
    super(message);
    this.name = "DomainError";
  }
}

export const ValidationError = (m: string) => new DomainError("ValidationError", m, 400);
export const AuthError = (m: string) => new DomainError("AuthError", m, 401);
export const AuthzError = (m: string) => new DomainError("AuthzError", m, 403);
export const DuplicateError = (m: string) => new DomainError("DuplicateError", m, 409);
export const NotFoundError = (m: string) => new DomainError("NotFound", m, 404);
export const ConflictError = (m: string) => new DomainError("Conflict", m, 409);

export function safeMessage(err: unknown): { status: number; message: string } {
  if (err instanceof DomainError) return { status: err.httpStatus, message: err.message };
  // Never leak internals (stacks/SQL/secrets) — log server-side instead.
  console.error("[internal]", err);
  return { status: 500, message: "Something went wrong. Please try again." };
}

import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/guards";
import { fail } from "./respond";
import { logger } from "@/lib/logger";

export function handleError(err: unknown) {
  const requestId = crypto.randomUUID();
  if (err instanceof AuthError) {
    return fail(err.status, err.status === 401 ? "unauthorized" : "forbidden", err.message, requestId);
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return fail(400, "validation_error", `${first?.path.join(".") ?? "input"}: ${first?.message ?? "invalid"}`, requestId);
  }
  if (err instanceof DomainError) {
    if (err.status >= 500) logger.error({ err, requestId, code: err.code }, "domain_error");
    else logger.info({ requestId, code: err.code, status: err.status }, "api_client_error");
    return fail(err.status, err.code, err.message, requestId);
  }
  logger.error({ err, requestId }, "unhandled_api_error");
  return fail(500, "server_error", "Something went wrong.", requestId);
}

export class DomainError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

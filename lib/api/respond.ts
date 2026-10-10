import { NextResponse } from "next/server";

export type Envelope<T> = {
  data: T | null;
  error: { code: string; message: string } | null;
  meta?: Record<string, unknown>;
};

export function ok<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  const body: Envelope<T> = { data, error: null, ...(meta ? { meta } : {}) };
  return NextResponse.json(body, { status });
}

export function fail(status: number, code: string, message: string, requestId?: string) {
  const body: Envelope<null> = {
    data: null,
    error: { code, message },
    ...(requestId ? { meta: { requestId } } : {}),
  };
  const headers = requestId ? { "x-request-id": requestId } : undefined;
  return NextResponse.json(body, { status, headers });
}

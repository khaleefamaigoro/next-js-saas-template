import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/lib/auth/context";
import { COOKIE_NAMES } from "@/lib/auth/session";

const PUBLIC_PLATFORM = [
  "/",
  "/auth/login",
  "/auth/change-password",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/terms",
  "/privacy",
  "/dpa",
  "/status",
];
const PUBLIC_ADMIN = [
  "/admin/auth/login",
  "/admin/auth/change-password",
  "/admin/auth/forgot-password",
  "/admin/auth/reset-password",
  "/admin/auth/impersonate",
];
const PUBLIC_CLIENT = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/change-password",
];

function inList(path: string, list: string[]): boolean {
  return list.some((p) => path === p || path.startsWith(`${p}/`));
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const url = request.nextUrl;
  const path = url.pathname;

  if (path.startsWith("/api/")) return withSecurityHeaders(NextResponse.next());
  if (path.startsWith("/_next/") || path === "/favicon.ico" || path.startsWith("/assets/")) {
    return NextResponse.next();
  }
  // Maintenance screen must serve on any host without auth/rewrite so the
  // lifecycle redirect (PRD §13) does not loop back to a login redirect.
  if (path === "/maintenance") return NextResponse.next();

  const ctx = resolveHost(host);

  if (ctx.mode === "unknown") {
    const u = url.clone();
    u.pathname = "/unknown-tenant";
    return NextResponse.rewrite(u, { status: 404 });
  }

  if (ctx.mode === "platform") return handlePlatform(request);
  return handleTenant(request);
}

function handlePlatform(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const hasSession = !!request.cookies.get(COOKIE_NAMES.platform)?.value;

  if (path === "/") {
    return NextResponse.next();
  }
  if (inList(path, PUBLIC_PLATFORM)) {
    return NextResponse.next();
  }
  if (!hasSession) {
    const u = url.clone();
    u.pathname = "/auth/login";
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
}

function handleTenant(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  if (["/terms", "/privacy", "/dpa", "/status"].includes(path)) {
    return NextResponse.next();
  }
  const isAdmin = path === "/admin" || path.startsWith("/admin/");

  if (isAdmin) return handleAdmin(request);
  return handleClient(request);
}

function handleClient(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const hasSession = !!request.cookies.get(COOKIE_NAMES.client)?.value;

  if (path === "/") {
    if (hasSession) {
      const u = url.clone();
      u.pathname = "/dashboard";
      return NextResponse.redirect(u);
    }
    return NextResponse.rewrite(new URL(`/c${url.search}`, url));
  }
  if (inList(path, PUBLIC_CLIENT)) {
    return NextResponse.rewrite(new URL(`/c${path}${url.search}`, url));
  }
  if (!hasSession) {
    const u = url.clone();
    u.pathname = "/auth/login";
    return NextResponse.redirect(u);
  }
  return NextResponse.rewrite(new URL(`/c${path}${url.search}`, url));
}

function handleAdmin(request: NextRequest) {
  const url = request.nextUrl;
  const path = url.pathname;
  const hasSession = !!request.cookies.get(COOKIE_NAMES.tenant)?.value;

  if (inList(path, PUBLIC_ADMIN)) {
    return NextResponse.next();
  }
  if (!hasSession) {
    const u = url.clone();
    u.pathname = "/admin/auth/login";
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

import { NextRequest, NextResponse } from "next/server";

const allowedRoots = new Set([
  "auth",
  "api-keys",
  "dashboard",
  "health",
  "invoices",
  "networks",
  "openapi.json",
  "payments",
  "projects",
  "test",
  "tokens",
  "transactions"
]);
const maximumBodyBytes = 64 * 1024;
const mutationMethods = new Set(["POST", "PATCH", "DELETE"]);

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(request: NextRequest, context: RouteContext) {
  const apiUrl = process.env.FLUXTX_API_URL;
  if (!apiUrl) {
    return NextResponse.json(
      { error: { code: "api_not_configured", message: "Set FLUXTX_API_URL to the FluxTx API origin." } },
      { status: 503 }
    );
  }

  if (mutationMethods.has(request.method) && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json(
      { error: { code: "origin_mismatch", message: "Request origin is not allowed." } },
      { status: 403 }
    );
  }

  const { path } = await context.params;
  if (
    path.length < 2
    || path[0] !== "v1"
    || !allowedRoots.has(path[1])
    || path.some((segment) => segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))
  ) {
    return NextResponse.json(
      { error: { code: "not_found", message: "API route not found." } },
      { status: 404 }
    );
  }

  let upstreamOrigin: string;
  try {
    const parsed = new URL(apiUrl);
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.pathname !== "/" || parsed.search || parsed.hash) {
      return NextResponse.json(
        { error: { code: "invalid_api_configuration", message: "FLUXTX_API_URL must be an HTTP(S) origin." } },
        { status: 500 }
      );
    }
    upstreamOrigin = parsed.origin;
  } catch {
    return NextResponse.json(
      { error: { code: "invalid_api_configuration", message: "FLUXTX_API_URL must be an HTTP(S) origin." } },
      { status: 500 }
    );
  }

  let body: ArrayBuffer | undefined;
  if (request.method !== "GET" && request.method !== "HEAD") {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > maximumBodyBytes) {
      return NextResponse.json(
        { error: { code: "request_too_large", message: "Request body exceeds 64 KiB." } },
        { status: 413 }
      );
    }
    body = await request.arrayBuffer();
    if (body.byteLength > maximumBodyBytes) {
      return NextResponse.json(
        { error: { code: "request_too_large", message: "Request body exceeds 64 KiB." } },
        { status: 413 }
      );
    }
  }

  const upstreamUrl = new URL(`/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, upstreamOrigin);
  const headers = new Headers();
  for (const name of ["accept", "authorization", "content-type", "cookie", "idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (mutationMethods.has(request.method)) headers.set("origin", upstreamOrigin);

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000)
    });
  } catch (error) {
    console.error("FluxTx API proxy failed", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    return NextResponse.json(
      { error: { code: "api_unavailable", message: "The FluxTx API could not be reached." } },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  for (const name of ["content-type", "cache-control", "retry-after", "x-request-id"]) {
    const value = response.headers.get(name);
    if (value) responseHeaders.set(name, value);
  }
  for (const cookie of response.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }
  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;

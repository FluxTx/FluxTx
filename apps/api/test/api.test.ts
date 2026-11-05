import { describe, expect, it } from "vitest";
import app from "../src/index.js";

describe("FluxTx API foundation", () => {
  it("serves a versioned health endpoint with a request ID", async () => {
    const response = await app.request("/v1/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toMatch(
      /^[0-9a-f-]{36}$/
    );
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("returns chain support statuses without claiming unverified support", async () => {
    const response = await app.request("/v1/networks");
    const body = await response.json() as {
      data: { id: string; status: string }[];
      meta: { count: number };
    };

    expect(response.status).toBe(200);
    expect(body.meta.count).toBe(body.data.length);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data.every((network) => network.status === "PLANNED")).toBe(true);
  });

  it("serves OpenAPI for implemented routes without documenting unavailable features", async () => {
    const response = await app.request("/v1/openapi.json");
    const body = await response.json() as {
      openapi: string;
      servers: { url: string }[];
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.servers).toEqual([{ url: "/v1" }]);
    expect(body.paths["/invoices"]?.post?.security).toEqual([{ bearerApiKey: [] }]);
    expect(body.paths["/payments/{id}"]?.get).toBeDefined();
    expect(body.paths["/payments/{id}/events"]?.get).toBeDefined();
    expect(body.paths["/payments/{id}/cancel"]?.post).toBeDefined();
    expect(body.paths["/tokens"]?.get).toBeDefined();
    expect(body.paths["/projects/{id}"]?.patch).toBeDefined();
    expect(body.paths["/dashboard/overview"]?.get?.security).toEqual([{ sessionCookie: [] }]);
    expect(body.paths["/dashboard/payments"]?.get?.security).toEqual([{ sessionCookie: [] }]);
    expect(body.paths["/dashboard/payments/{id}"]?.get?.security).toEqual([{ sessionCookie: [] }]);
    expect(body.paths["/test/simulate-transfer"]?.post).toBeDefined();
    expect(body.paths["/transactions/{hash}"]?.get?.security).toEqual([{ bearerApiKey: [] }]);
    expect(body.paths["/webhooks"]).toBeUndefined();
  });

  it("returns a consistent error response for unknown routes", async () => {
    const response = await app.request("/v1/unknown");
    const body = await response.json() as { error: { code: string } };

    expect(response.status).toBe(404);
    expect(body.error.code).toBe("not_found");
  });
});

import { describe, expect, it } from "vitest";
import app from "../src/index.js";

describe("authentication request boundaries", () => {
  it("rejects account mutations without a same-origin header", async () => {
    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "merchant@example.test",
        password: "correct-horse-battery-946",
        organizationName: "Merchant"
      })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "origin_mismatch" }
    });
  });

  it("validates registration before touching the database", async () => {
    const response = await app.request("/v1/auth/register", {
      method: "POST",
      headers: {
        origin: "http://localhost",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        email: "not-an-email",
        password: "short",
        organizationName: ""
      })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_request" }
    });
  });

  it("protects session and API-key routes when credentials are absent", async () => {
    const session = await app.request("/v1/auth/me");
    const payments = await app.request("/v1/payments");
    const invoice = await app.request("/v1/invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const simulate = await app.request("/v1/test/simulate-transfer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });

    expect(session.status).toBe(401);
    expect(payments.status).toBe(401);
    expect(invoice.status).toBe(401);
    expect(simulate.status).toBe(401);
  });

  it("does not return internal exception details", async () => {
    const response = await app.request("/v1/api-keys/not-a-uuid", {
      method: "DELETE",
      headers: { origin: "http://localhost" }
    });

    expect(response.status).toBe(401);
    expect(await response.text()).not.toContain("SELECT");
  });
});

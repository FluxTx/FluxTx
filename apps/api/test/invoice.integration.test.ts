import { readdir, readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app from "../src/index.js";

describe("invoice D1 integration", () => {
  let miniflare: Miniflare | undefined;
  let database: D1Database;
  let rejectRateLimitedRequests = false;
  const environment = {
    DB: undefined as unknown as D1Database,
    API_RATE_LIMITER: {
      limit: async () => ({ success: !rejectRateLimitedRequests })
    } satisfies RateLimit
  };

  beforeAll(async () => {
    miniflare = new Miniflare({
      workers: [{
        config: {
          name: "fluxtx-integration-test",
          compatibilityDate: "2026-11-05",
          manifest: {
            mainModule: "worker.mjs",
            modules: {
              "worker.mjs": {
                type: "esm",
                contents: "export default { fetch() { return new Response('ok'); } };"
              }
            }
          },
          env: { DB: { type: "d1", id: "fluxtx-integration-test" } }
        }
      }]
    });
    database = await miniflare.getD1Database("DB");
    environment.DB = database;

    const migrationDirectory = new URL("../migrations/", import.meta.url);
    const migrations = (await readdir(migrationDirectory))
      .filter((name) => name.endsWith(".sql"))
      .sort();
    for (const migration of migrations) {
      const statements = (await readFile(new URL(migration, migrationDirectory), "utf8"))
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement && !statement.startsWith("PRAGMA foreign_keys"));
      for (const statement of statements) {
        await database.prepare(statement).run();
      }
    }
  }, 30_000);

  afterAll(async () => {
    await miniflare?.dispose();
  });

  it("persists idempotent invoices and race-safe simulated transfers and events", async () => {
    const origin = "http://localhost";
    const tokenCatalogue = await app.request("/v1/tokens", {}, environment);
    expect(tokenCatalogue.status).toBe(200);
    await expect(tokenCatalogue.json()).resolves.toMatchObject({
      data: [{
        id: "local-test-asset",
        networkId: "local-test-simulator",
        supportStatus: "UNSUPPORTED",
        testOnly: true
      }],
      meta: { count: 1 }
    });
    const password = "correct-horse-battery-946";
    const email = `merchant-${crypto.randomUUID()}@example.test`;
    const register = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password, organizationName: "Integration" })
    }, environment);
    expect(register.status).toBe(201);
    const cookie = register.headers.get("set-cookie")?.split(";", 1)[0];
    expect(cookie).toBeTruthy();
    const registered = await register.json() as {
      data: { project: { id: string } };
    };
    const emptyOverview = await app.request("/v1/dashboard/overview", {
      headers: { cookie: cookie! }
    }, environment);
    expect(emptyOverview.status).toBe(200);
    await expect(emptyOverview.json()).resolves.toMatchObject({
      data: {
        counts: {
          totalPayments: 0,
          confirmedPayments: 0,
          pendingPayments: 0,
          failedPayments: 0
        },
        recentPayments: []
      }
    });
    const projectUrl = `/v1/projects/${registered.data.project.id}`;
    const projectRead = await app.request(projectUrl, {
      headers: { cookie: cookie! }
    }, environment);
    expect(projectRead.status).toBe(200);
    const projectRename = await app.request(projectUrl, {
      method: "PATCH",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Renamed test project" })
    }, environment);
    expect(projectRename.status).toBe(200);
    await expect(projectRename.json()).resolves.toMatchObject({
      data: { id: registered.data.project.id, name: "Renamed test project", environment: "test" }
    });
    const projectEnvironmentMutation = await app.request(projectUrl, {
      method: "PATCH",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Invalid rename", environment: "live" })
    }, environment);
    expect(projectEnvironmentMutation.status).toBe(400);

    const keyResponse = await app.request("/v1/api-keys", {
      method: "POST",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        projectId: registered.data.project.id,
        name: "integration",
        permissions: ["invoices:read", "invoices:write", "transactions:read"]
      })
    }, environment);
    expect(keyResponse.status).toBe(201);
    const keyBody = await keyResponse.json() as { data: { id: string; secret: string } };
    const apiKey = keyBody.data.secret;
    const listedKeys = await app.request("/v1/api-keys", {
      headers: { cookie: cookie! }
    }, environment);
    expect(listedKeys.status).toBe(200);
    const listedKeyBody = await listedKeys.json() as { data: Record<string, unknown>[] };
    expect(listedKeyBody.data.every((key) => !("secret" in key))).toBe(true);
    expect(listedKeyBody.data[0]?.permissions).toEqual([
      "invoices:read",
      "invoices:write",
      "transactions:read"
    ]);
    const apiHeaders = {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    };

    const createInvoice = (idempotencyKey: string, amount = "10") =>
      app.request("/v1/invoices", {
        method: "POST",
        headers: { ...apiHeaders, "idempotency-key": idempotencyKey },
        body: JSON.stringify({
          amount,
          tokenId: "local-test-asset",
          networkId: "local-test-simulator"
        })
      }, environment);

    const created = await createInvoice("invoice-1");
    expect(created.status).toBe(201);
    const invoiceBody = await created.json() as { data: { id: string } };
    const populatedOverview = await app.request(
      `/v1/dashboard/overview?projectId=${registered.data.project.id}`,
      { headers: { cookie: cookie! } },
      environment
    );
    expect(populatedOverview.status).toBe(200);
    await expect(populatedOverview.json()).resolves.toMatchObject({
      data: {
        counts: { totalPayments: 1, pendingPayments: 1 },
        recentPayments: [{ id: invoiceBody.data.id, status: "pending" }]
      }
    });
    const dashboardPayments = await app.request(
      `/v1/dashboard/payments?projectId=${registered.data.project.id}&status=pending&search=${invoiceBody.data.id}`,
      { headers: { cookie: cookie! } },
      environment
    );
    expect(dashboardPayments.status).toBe(200);
    await expect(dashboardPayments.json()).resolves.toMatchObject({
      data: [{
        id: invoiceBody.data.id,
        status: "pending",
        projectId: registered.data.project.id,
        symbol: "TST",
        networkId: "local-test-simulator"
      }],
      meta: { limit: 25, offset: 0, total: 1 }
    });
    const dashboardPaymentDetail = await app.request(
      `/v1/dashboard/payments/${invoiceBody.data.id}`,
      { headers: { cookie: cookie! } },
      environment
    );
    expect(dashboardPaymentDetail.status).toBe(200);
    await expect(dashboardPaymentDetail.json()).resolves.toMatchObject({
      data: {
        payment: { id: invoiceBody.data.id, status: "pending" },
        events: [{ eventType: "invoice.created", nextStatus: "pending" }],
        transactions: []
      }
    });
    const invalidDashboardFilter = await app.request("/v1/dashboard/payments?status=not-a-status", {
      headers: { cookie: cookie! }
    }, environment);
    expect(invalidDashboardFilter.status).toBe(400);
    const paymentDetails = await app.request(`/v1/payments/${invoiceBody.data.id}`, {
      headers: apiHeaders
    }, environment);
    expect(paymentDetails.status).toBe(200);
    await expect(paymentDetails.json()).resolves.toMatchObject({
      data: { id: invoiceBody.data.id, status: "pending" }
    });

    const secondProject = await app.request("/v1/projects", {
      method: "POST",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Isolated project", environment: "test" })
    }, environment);
    expect(secondProject.status).toBe(201);
    const secondProjectBody = await secondProject.json() as { data: { id: string } };
    const conflictingRename = await app.request(projectUrl, {
      method: "PATCH",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({ name: "Isolated project" })
    }, environment);
    expect(conflictingRename.status).toBe(409);
    const secondKeyResponse = await app.request("/v1/api-keys", {
      method: "POST",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        projectId: secondProjectBody.data.id,
        name: "isolated",
        permissions: ["invoices:read", "invoices:write", "transactions:read"]
      })
    }, environment);
    expect(secondKeyResponse.status).toBe(201);
    const secondKeyBody = await secondKeyResponse.json() as { data: { secret: string } };
    const isolatedPaymentRead = await app.request(`/v1/payments/${invoiceBody.data.id}`, {
      headers: { authorization: `Bearer ${secondKeyBody.data.secret}` }
    }, environment);
    expect(isolatedPaymentRead.status).toBe(404);
    const isolatedInvoiceRead = await app.request(`/v1/invoices/${invoiceBody.data.id}`, {
      headers: { authorization: `Bearer ${secondKeyBody.data.secret}` }
    }, environment);
    expect(isolatedInvoiceRead.status).toBe(404);
    const isolatedTransaction = await app.request("/v1/transactions", {
      headers: { authorization: `Bearer ${secondKeyBody.data.secret}` }
    }, environment);
    expect(isolatedTransaction.status).toBe(200);
    await expect(isolatedTransaction.json()).resolves.toMatchObject({
      data: [],
      meta: { total: 0 }
    });
    const restrictedKey = await app.request("/v1/api-keys", {
      method: "POST",
      headers: {
        origin,
        cookie: cookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        projectId: registered.data.project.id,
        name: "invoice-only",
        permissions: ["invoices:read"]
      })
    }, environment);
    expect(restrictedKey.status).toBe(201);
    const restrictedKeyBody = await restrictedKey.json() as { data: { secret: string } };
    const forbiddenTransactions = await app.request("/v1/transactions", {
      headers: { authorization: `Bearer ${restrictedKeyBody.data.secret}` }
    }, environment);
    expect(forbiddenTransactions.status).toBe(403);
    const forbiddenCancellation = await app.request(`/v1/payments/${invoiceBody.data.id}/cancel`, {
      method: "POST",
      headers: { authorization: `Bearer ${restrictedKeyBody.data.secret}` }
    }, environment);
    expect(forbiddenCancellation.status).toBe(403);

    const replay = await createInvoice("invoice-1");
    expect(replay.status).toBe(200);
    await expect(replay.json()).resolves.toMatchObject({
      data: { id: invoiceBody.data.id, status: "pending" }
    });
    expect((await createInvoice("invoice-1", "11")).status).toBe(409);

    const transfer = (idempotencyKey: string, amount: string) =>
      app.request("/v1/test/simulate-transfer", {
        method: "POST",
        headers: { ...apiHeaders, "idempotency-key": idempotencyKey },
        body: JSON.stringify({ invoiceId: invoiceBody.data.id, amount })
      }, environment);
    const concurrent = await Promise.all([
      transfer("transfer-1", "4"),
      transfer("transfer-2", "4")
    ]);
    expect(concurrent.every((response) => response.status === 201 || response.status === 409)).toBe(true);

    for (const [index, response] of concurrent.entries()) {
      if (response.status === 409) {
        const retry = await transfer(`transfer-${index + 1}`, "4");
        expect(retry.status).toBe(201);
      }
    }

    const confirmed = await transfer("transfer-3", "2");
    expect(confirmed.status).toBe(201);
    await expect(confirmed.json()).resolves.toMatchObject({
      data: {
        simulated: true,
        invoice: { id: invoiceBody.data.id, status: "confirmed", amountRaw: "10000000" }
      }
    });
    const transferReplay = await transfer("transfer-3", "2");
    expect(transferReplay.status).toBe(200);
    await expect(transferReplay.json()).resolves.toMatchObject({
      data: { simulated: true, invoice: { id: invoiceBody.data.id, status: "confirmed" } }
    });
    expect((await transfer("transfer-3", "3")).status).toBe(409);
    const overpaid = await transfer("transfer-4", "1");
    expect(overpaid.status).toBe(201);
    await expect(overpaid.json()).resolves.toMatchObject({
      data: { invoice: { status: "overpaid", amountRaw: "11000000" } }
    });
    const cancelConfirmed = await app.request(`/v1/payments/${invoiceBody.data.id}/cancel`, {
      method: "POST",
      headers: apiHeaders
    }, environment);
    expect(cancelConfirmed.status).toBe(409);

    const cancellable = await createInvoice("invoice-cancel", "3");
    const cancellableBody = await cancellable.json() as { data: { id: string } };
    const cancelPayment = () => app.request(`/v1/payments/${cancellableBody.data.id}/cancel`, {
      method: "POST",
      headers: apiHeaders
    }, environment);
    const cancelled = await cancelPayment();
    expect(cancelled.status).toBe(200);
    await expect(cancelled.json()).resolves.toMatchObject({
      data: { id: cancellableBody.data.id, status: "cancelled" }
    });
    const cancelledAgain = await cancelPayment();
    expect(cancelledAgain.status).toBe(200);
    await expect(cancelledAgain.json()).resolves.toMatchObject({
      data: { id: cancellableBody.data.id, status: "cancelled" }
    });
    const lateCancelledTransfer = await app.request("/v1/test/simulate-transfer", {
      method: "POST",
      headers: { ...apiHeaders, "idempotency-key": "late-after-cancel" },
      body: JSON.stringify({ invoiceId: cancellableBody.data.id, amount: "1" })
    }, environment);
    expect(lateCancelledTransfer.status).toBe(201);
    await expect(lateCancelledTransfer.json()).resolves.toMatchObject({
      data: { invoice: { id: cancellableBody.data.id, status: "underpaid" } }
    });
    const cancellationEvents = await database.prepare(
      "SELECT COUNT(*) AS count FROM payment_events WHERE payment_id = ? AND event_type = 'payment.cancelled'"
    ).bind(cancellableBody.data.id).first<{ count: number }>();
    expect(cancellationEvents?.count).toBe(1);
    const paymentEventHistory = await app.request(
      `/v1/payments/${cancellableBody.data.id}/events?limit=100`,
      { headers: apiHeaders },
      environment
    );
    expect(paymentEventHistory.status).toBe(200);
    const paymentEventBody = await paymentEventHistory.json() as {
      data: { eventType: string; payload: unknown }[];
      meta: { total: number };
    };
    expect(paymentEventBody.meta.total).toBe(4);
    expect(paymentEventBody.data.map((event) => event.eventType)).toEqual([
      "invoice.created",
      "payment.cancelled",
      "payment.detected",
      "payment.underpaid"
    ]);

    const expiring = await createInvoice("invoice-2", "5");
    const expiringBody = await expiring.json() as { data: { id: string } };
    const expire = () => app.request(`/v1/invoices/${expiringBody.data.id}/expire`, {
      method: "POST",
      headers: { ...apiHeaders, origin }
    }, environment);
    const expirationResponses = await Promise.all([expire(), expire()]);
    expect(expirationResponses.every((response) => response.status === 200)).toBe(true);
    const lateTransfer = await app.request("/v1/test/simulate-transfer", {
      method: "POST",
      headers: { ...apiHeaders, "idempotency-key": "late-payment" },
      body: JSON.stringify({ invoiceId: expiringBody.data.id, amount: "1" })
    }, environment);
    expect(lateTransfer.status).toBe(201);
    await expect(lateTransfer.json()).resolves.toMatchObject({
      data: { invoice: { status: "underpaid", amountRaw: "1000000" } }
    });

    const expirationEvents = await database.prepare(
      "SELECT COUNT(*) AS count FROM payment_events WHERE payment_id = ? AND event_type = 'payment.expired'"
    ).bind(expiringBody.data.id).first<{ count: number }>();
    expect(expirationEvents?.count).toBe(1);
    const transferCounts = await database.prepare(
      `SELECT COUNT(DISTINCT blockchain_transactions.transaction_hash) AS transactions,
              COUNT(DISTINCT transaction_observations.id) AS observations,
              COUNT(DISTINCT payment_revision_claims.revision) AS revisions
       FROM payments
       LEFT JOIN payment_matches ON payment_matches.payment_id = payments.id
       LEFT JOIN transaction_observations
         ON transaction_observations.id = payment_matches.observation_id
       LEFT JOIN blockchain_transactions
         ON blockchain_transactions.id = transaction_observations.transaction_id
       LEFT JOIN payment_revision_claims
         ON payment_revision_claims.payment_id = payments.id
       WHERE payments.id = ?`
    ).bind(invoiceBody.data.id).first<{
      transactions: number;
      observations: number;
      revisions: number;
    }>();
    expect(transferCounts).toEqual({ transactions: 4, observations: 4, revisions: 4 });
    const transactionHash = await database.prepare(
      `SELECT blockchain_transactions.transaction_hash
       FROM blockchain_transactions
       JOIN transaction_observations
         ON transaction_observations.transaction_id = blockchain_transactions.id
       JOIN payment_matches ON payment_matches.observation_id = transaction_observations.id
       WHERE payment_matches.payment_id = ? LIMIT 1`
    ).bind(invoiceBody.data.id).first<{ transaction_hash: string }>();
    expect(transactionHash).toBeTruthy();
    const transactionList = await app.request("/v1/transactions?limit=2", {
      headers: { authorization: `Bearer ${apiKey}` }
    }, environment);
    expect(transactionList.status).toBe(200);
    await expect(transactionList.json()).resolves.toMatchObject({
      meta: { limit: 2, total: 6 }
    });
    const transactionDetails = await app.request(
      `/v1/transactions/${transactionHash!.transaction_hash}?networkId=local-test-simulator`,
      { headers: { authorization: `Bearer ${apiKey}` } },
      environment
    );
    expect(transactionDetails.status).toBe(200);
    await expect(transactionDetails.json()).resolves.toMatchObject({
      data: [{
        transactionHash: transactionHash!.transaction_hash,
        networkId: "local-test-simulator",
        simulated: true,
        finalityStatus: "finalized",
        paymentId: invoiceBody.data.id
      }]
    });
    const unknownTransaction = await app.request(
      `/v1/transactions/${transactionHash!.transaction_hash}`,
      { headers: { authorization: `Bearer ${secondKeyBody.data.secret}` } },
      environment
    );
    expect(unknownTransaction.status).toBe(404);

    rejectRateLimitedRequests = true;
    const limited = await app.request("/v1/invoices", {
      headers: { authorization: `Bearer ${apiKey}` }
    }, environment);
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBe("60");
    rejectRateLimitedRequests = false;

    const revoke = await app.request(`/v1/api-keys/${keyBody.data.id}`, {
      method: "DELETE",
      headers: { origin, cookie: cookie! }
    }, environment);
    expect(revoke.status).toBe(204);
    const revokedKeyRequest = await app.request("/v1/invoices", {
      headers: { authorization: `Bearer ${apiKey}` }
    }, environment);
    expect(revokedKeyRequest.status).toBe(401);
  }, 60_000);

  it("verifies login sessions and enforces session mutation origins", async () => {
    const origin = "http://localhost";
    const email = `session-${crypto.randomUUID()}@example.test`;
    const password = "correct-horse-battery-946";
    const registered = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password, organizationName: "Session test" })
    }, environment);
    expect(registered.status).toBe(201);
    const registrationCookie = registered.headers.get("set-cookie")?.split(";", 1)[0];
    expect(registrationCookie).toBeTruthy();

    const badLogin = await app.request("/v1/auth/login", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password: "incorrect-password" })
    }, environment);
    expect(badLogin.status).toBe(401);

    const login = await app.request("/v1/auth/login", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password })
    }, environment);
    expect(login.status).toBe(200);
    const loginCookie = login.headers.get("set-cookie")?.split(";", 1)[0];
    expect(loginCookie).toBeTruthy();
    const currentSession = await app.request("/v1/auth/me", {
      headers: { cookie: loginCookie! }
    }, environment);
    expect(currentSession.status).toBe(200);
    await expect(currentSession.json()).resolves.toMatchObject({
      data: { user: { email } }
    });

    const rejectedLogout = await app.request("/v1/auth/logout", {
      method: "POST",
      headers: { cookie: loginCookie!, origin: "https://attacker.example" }
    }, environment);
    expect(rejectedLogout.status).toBe(403);
    expect((await app.request("/v1/auth/me", {
      headers: { cookie: loginCookie! }
    }, environment)).status).toBe(200);

    const logout = await app.request("/v1/auth/logout", {
      method: "POST",
      headers: { cookie: loginCookie!, origin }
    }, environment);
    expect(logout.status).toBe(200);
    expect((await app.request("/v1/auth/me", {
      headers: { cookie: loginCookie! }
    }, environment)).status).toBe(401);

    const duplicateRegistration = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({ email, password, organizationName: "Duplicate" })
    }, environment);
    expect(duplicateRegistration.status).toBe(409);
    expect(registrationCookie).not.toBe(loginCookie);

    const otherAccount = await app.request("/v1/auth/register", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify({
        email: `other-${crypto.randomUUID()}@example.test`,
        password,
        organizationName: "Other organization"
      })
    }, environment);
    expect(otherAccount.status).toBe(201);
    const otherAccountBody = await otherAccount.json() as {
      data: { project: { id: string } };
    };
    const foreignProjectRead = await app.request(
      `/v1/projects/${otherAccountBody.data.project.id}`,
      { headers: { cookie: registrationCookie! } },
      environment
    );
    expect(foreignProjectRead.status).toBe(404);
    const foreignProjectKey = await app.request("/v1/api-keys", {
      method: "POST",
      headers: {
        origin,
        cookie: registrationCookie!,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        projectId: otherAccountBody.data.project.id,
        name: "foreign",
        permissions: ["invoices:read"]
      })
    }, environment);
    expect(foreignProjectKey.status).toBe(404);
  }, 60_000);
});

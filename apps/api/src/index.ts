import { Hono, type Context, type Next } from "hono";
import { bodyLimit } from "hono/body-limit";
import {
  canTransitionPayment,
  isNetworkVerified,
  networks,
  parseUnits,
  type PaymentStatus
} from "@fluxtx/core";
import { openApiDocument } from "./openapi.js";
import { z } from "zod";

type Bindings = {
  DB: D1Database;
  API_RATE_LIMITER: RateLimit;
};

type AuthenticatedUser = {
  id: string;
  email: string;
};

type AuthenticatedProject = {
  projectId: string;
  environment: "test" | "live";
  permissions: string[];
};

type Variables = {
  user: AuthenticatedUser;
  project: AuthenticatedProject;
};

type AppEnvironment = { Bindings: Bindings; Variables: Variables };

const app = new Hono<AppEnvironment>().basePath("/v1");
const passwordIterations = 310_000;
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
const sessionCookie = "fluxtx_session";
const passwordSchema = z.string().min(12).max(128);
const emailSchema = z.string().email().max(254).transform((email) => email.toLowerCase());
const permissionSchema = z.enum([
  "invoices:read",
  "invoices:write",
  "transactions:read",
  "webhooks:read",
  "webhooks:write"
]);
const apiKeyPermissions = permissionSchema.options;
const dummyPasswordHash =
  "pbkdf2-sha256$310000$MDEyMzQ1Njc4OWFiY2RlZg==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

app.use("*", bodyLimit({ maxSize: 64 * 1024 }));

function jsonError(
  context: { json: (body: object, status?: number) => Response },
  code: string,
  message: string,
  status: number
): Response {
  return context.json({ error: { code, message } }, status);
}

function randomToken(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }
  return bytes;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: passwordIterations },
    key,
    256
  );
  return `pbkdf2-sha256$${passwordIterations}$${encodeBase64(salt)}$${encodeBase64(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
  const iterations = Number(iterationsText);
  if (
    algorithm !== "pbkdf2-sha256"
    || !Number.isInteger(iterations)
    || iterations < 100_000
    || iterations > 1_000_000
    || !saltText
    || !expectedText
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: decodeBase64(saltText),
      iterations
    },
    key,
    256
  );
  const actual = new Uint8Array(bits);
  const expected = decodeBase64(expectedText);
  if (actual.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  for (const item of cookieHeader?.split(";") ?? []) {
    const [key, ...valueParts] = item.trim().split("=");
    if (key === name) return valueParts.join("=") || null;
  }
  return null;
}

function cookieHeader(token: string, secure: boolean, maxAge: number): string {
  return `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function isSameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

async function createSession(
  database: D1Database,
  userId: string
): Promise<string> {
  const token = randomToken(32);
  await database.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at)
     VALUES (?, ?, ?, datetime('now', ?))`
  ).bind(
    crypto.randomUUID(),
    userId,
    await sha256(token),
    `+${sessionLifetimeSeconds} seconds`
  ).run();
  return token;
}

const requireSession = async (context: Context<AppEnvironment>, next: Next) => {
  const token = cookieValue(context.req.header("cookie") ?? null, sessionCookie);
  if (!token) return jsonError(context, "unauthorized", "Sign in to continue.", 401);

  const user = await context.env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ? AND sessions.expires_at > datetime('now')`
  ).bind(await sha256(token)).first<AuthenticatedUser>();

  if (!user) return jsonError(context, "unauthorized", "Session is invalid or expired.", 401);
  context.set("user", user);
  await next();
};

const requireApiKey = async (context: Context<AppEnvironment>, next: Next) => {
  const authorization = context.req.header("authorization");
  const rawKey = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const keyPattern = new RegExp("^flxt_(?:test|live)_[A-Za-z0-9_-]{43}$");
  if (!keyPattern.test(rawKey)) {
    return jsonError(context, "unauthorized", "A valid API key is required.", 401);
  }

  const keyHash = await sha256(rawKey);
  const key = await context.env.DB.prepare(
    `SELECT api_keys.id, api_keys.project_id AS projectId, api_keys.environment,
            api_keys.revoked_at, projects.environment AS projectEnvironment,
            api_keys.permissions
     FROM api_keys
     JOIN projects ON projects.id = api_keys.project_id
     WHERE api_keys.key_hash = ?`
  ).bind(keyHash).first<{
    id: string;
    projectId: string;
    environment: string;
    projectEnvironment: string;
    revoked_at: string | null;
    permissions: string;
  }>();

  if (
    !key
    || key.revoked_at
    || key.environment !== key.projectEnvironment
    || !rawKey.startsWith(key.environment === "test" ? "flxt_test_" : "flxt_live_")
  ) {
    return jsonError(context, "unauthorized", "A valid API key is required.", 401);
  }

  const rateLimit = await context.env.API_RATE_LIMITER.limit({ key: key.id });
  if (!rateLimit.success) {
    context.header("retry-after", "60");
    return jsonError(context, "rate_limited", "API key request limit exceeded. Retry shortly.", 429);
  }

  await context.env.DB.prepare(
    "UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?"
  ).bind(key.id).run();
  context.set("project", {
    projectId: key.projectId,
    environment: key.environment as "test" | "live",
    permissions: JSON.parse(key.permissions) as string[]
  });
  await next();
};

async function loginRateLimited(
  database: D1Database,
  email: string,
  ipAddress: string
): Promise<boolean> {
  const [emailAttempts, ipAttempts] = await Promise.all([
    database.prepare(
      `SELECT COUNT(*) AS count FROM login_attempts
       WHERE email = ? AND succeeded = 0
         AND attempted_at > datetime('now', '-15 minutes')`
    ).bind(email).first<{ count: number }>(),
    database.prepare(
      `SELECT COUNT(*) AS count FROM login_attempts
       WHERE ip_address = ? AND succeeded = 0
         AND attempted_at > datetime('now', '-15 minutes')`
    ).bind(ipAddress).first<{ count: number }>()
  ]);
  return (emailAttempts?.count ?? 0) >= 10 || (ipAttempts?.count ?? 0) >= 30;
}

async function recordLoginAttempt(
  database: D1Database,
  email: string,
  ipAddress: string,
  succeeded: boolean
): Promise<void> {
  await database.prepare(
    "INSERT INTO login_attempts (id, email, ip_address, succeeded) VALUES (?, ?, ?, ?)"
  ).bind(crypto.randomUUID(), email, ipAddress, succeeded ? 1 : 0).run();
}

app.use("*", async (context, next) => {
  context.header("x-request-id", crypto.randomUUID());
  await next();
});

app.onError((error, context) => {
  console.error("request failed", {
    requestId: context.res.headers.get("x-request-id"),
    errorName: error.name
  });
  return jsonError(
    context,
    "internal_error",
    "An unexpected error occurred.",
    500
  );
});

app.get("/health", (context) => context.json({ status: "ok" }));

app.get("/openapi.json", (context) => context.json(openApiDocument));

app.get("/networks", (context) => context.json({
  data: networks,
  meta: { count: networks.length }
}));

app.get("/tokens", async (context) => {
  const tokens = await context.env.DB.prepare(
    `SELECT tokens.id, tokens.symbol, tokens.name, tokens.address,
            tokens.decimals, tokens.explorer_url AS explorerUrl,
            tokens.confirmations_required AS confirmationsRequired,
            networks.id AS networkId, networks.name AS networkName,
            networks.family AS networkFamily,
            networks.support_status AS supportStatus,
            networks.family = 'test-simulator' AS testOnly
     FROM tokens
     JOIN networks ON networks.id = tokens.network_id
     WHERE tokens.enabled = 1 AND networks.enabled = 1
     ORDER BY networks.name, tokens.symbol`
  ).all<{
    id: string;
    symbol: string;
    name: string;
    address: string;
    decimals: number;
    explorerUrl: string;
    confirmationsRequired: number;
    networkId: string;
    networkName: string;
    networkFamily: string;
    supportStatus: string;
    testOnly: number;
  }>();
  return context.json({
    data: tokens.results.map((token) => ({
      ...token,
      testOnly: token.testOnly === 1
    })),
    meta: { count: tokens.results.length }
  });
});

app.post("/auth/register", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }

  const input = z.object({
    email: emailSchema,
    password: passwordSchema,
    organizationName: z.string().trim().min(1).max(120)
  }).safeParse(await context.req.json().catch(() => null));
  if (!input.success) {
    return jsonError(context, "invalid_request", "Provide a valid email, organization name, and password (12-128 characters).", 400);
  }

  const ipAddress = context.req.header("cf-connecting-ip") ?? "unknown";
  if (await loginRateLimited(context.env.DB, input.data.email, ipAddress)) {
    return jsonError(context, "rate_limited", "Too many account creation attempts. Try again later.", 429);
  }

  const userId = crypto.randomUUID();
  const organizationId = crypto.randomUUID();
  const projectId = crypto.randomUUID();
  const passwordHash = await hashPassword(input.data.password);

  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)"
      ).bind(userId, input.data.email, passwordHash),
      context.env.DB.prepare(
        "INSERT INTO organizations (id, name) VALUES (?, ?)"
      ).bind(organizationId, input.data.organizationName),
      context.env.DB.prepare(
        "INSERT INTO organization_memberships (organization_id, user_id, role) VALUES (?, ?, 'owner')"
      ).bind(organizationId, userId),
      context.env.DB.prepare(
        "INSERT INTO projects (id, organization_id, name, environment) VALUES (?, ?, 'Default test project', 'test')"
      ).bind(projectId, organizationId)
    ]);
  } catch (error) {
    const existing = await context.env.DB.prepare(
      "SELECT id FROM users WHERE email = ?"
    ).bind(input.data.email).first<{ id: string }>();
    if (existing) {
      return jsonError(context, "email_in_use", "An account with this email already exists.", 409);
    }
    console.error("account registration failed", error);
    return jsonError(context, "registration_failed", "The account could not be created.", 500);
  }

  await recordLoginAttempt(context.env.DB, input.data.email, ipAddress, true);
  const token = await createSession(context.env.DB, userId);
  context.header(
    "set-cookie",
    cookieHeader(token, new URL(context.req.url).protocol === "https:", sessionLifetimeSeconds)
  );
  return context.json({
    data: {
      user: { id: userId, email: input.data.email, emailVerified: false },
      organization: { id: organizationId, name: input.data.organizationName },
      project: { id: projectId, name: "Default test project", environment: "test" }
    }
  }, 201);
});

app.post("/auth/login", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }

  const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) })
    .safeParse(await context.req.json().catch(() => null));
  if (!input.success) {
    return jsonError(context, "invalid_request", "Provide a valid email and password.", 400);
  }

  const user = await context.env.DB.prepare(
    "SELECT id, email, password_hash FROM users WHERE email = ?"
  ).bind(input.data.email).first<AuthenticatedUser & { password_hash: string }>();

  const ipAddress = context.req.header("cf-connecting-ip") ?? "unknown";
  if (await loginRateLimited(context.env.DB, input.data.email, ipAddress)) {
    return jsonError(context, "rate_limited", "Too many sign-in attempts. Try again later.", 429);
  }

  const valid = user
    ? await verifyPassword(input.data.password, user.password_hash)
    : await verifyPassword(input.data.password, dummyPasswordHash);

  await recordLoginAttempt(context.env.DB, input.data.email, ipAddress, Boolean(user && valid));
  if (!user || !valid) {
    return jsonError(context, "invalid_credentials", "Email or password is incorrect.", 401);
  }

  const token = await createSession(context.env.DB, user.id);
  context.header(
    "set-cookie",
    cookieHeader(token, new URL(context.req.url).protocol === "https:", sessionLifetimeSeconds)
  );
  return context.json({ data: { user: { id: user.id, email: user.email } } });
});

app.use("/auth/me", requireSession);
app.get("/auth/me", (context) => context.json({
  data: { user: context.get("user") }
}));

app.use("/auth/logout", requireSession);
app.post("/auth/logout", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }
  const token = cookieValue(context.req.header("cookie") ?? null, sessionCookie);
  if (token) {
    await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?")
      .bind(await sha256(token)).run();
  }
  context.header("set-cookie", cookieHeader("", new URL(context.req.url).protocol === "https:", 0));
  return context.json({ data: { signedOut: true } });
});

app.use("/projects", requireSession);
app.use("/projects/*", requireSession);
app.use("/dashboard/*", requireSession);
app.get("/dashboard/overview", async (context) => {
  const query = z.object({
    projectId: z.string().uuid().optional()
  }).safeParse({ projectId: context.req.query("projectId") });
  if (!query.success) return jsonError(context, "invalid_request", "Invalid dashboard filters.", 400);

  const userId = context.get("user").id;
  const selectedProjectId = query.data.projectId;
  if (selectedProjectId) {
    const accessibleProject = await context.env.DB.prepare(
      `SELECT projects.id FROM projects
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       WHERE projects.id = ? AND organization_memberships.user_id = ?`
    ).bind(selectedProjectId, userId).first<{ id: string }>();
    if (!accessibleProject) return jsonError(context, "not_found", "Project not found.", 404);
  }

  const projectFilter = selectedProjectId ? "AND projects.id = ?" : "";
  const bindings = selectedProjectId ? [userId, selectedProjectId] : [userId];
  const [counts, recentPayments] = await Promise.all([
    context.env.DB.prepare(
      `SELECT COUNT(*) AS totalPayments,
              COALESCE(SUM(CASE WHEN payments.status = 'confirmed' THEN 1 ELSE 0 END), 0) AS confirmedPayments,
              COALESCE(SUM(CASE WHEN payments.status IN ('pending', 'detected', 'confirming', 'underpaid') THEN 1 ELSE 0 END), 0) AS pendingPayments,
              COALESCE(SUM(CASE WHEN payments.status = 'failed' THEN 1 ELSE 0 END), 0) AS failedPayments
       FROM payments
       JOIN projects ON projects.id = payments.project_id
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       WHERE organization_memberships.user_id = ? ${projectFilter}`
    ).bind(...bindings).first<{
      totalPayments: number;
      confirmedPayments: number;
      pendingPayments: number;
      failedPayments: number;
    }>(),
    context.env.DB.prepare(
      `SELECT payments.id, payments.status, payments.amount_raw AS amountRaw,
              payments.amount_due_raw AS amountDueRaw, payments.order_id AS orderId,
              tokens.symbol, tokens.decimals, networks.id AS networkId,
              projects.name AS projectName, payments.created_at AS createdAt
       FROM payments
       JOIN projects ON projects.id = payments.project_id
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       JOIN tokens ON tokens.id = payments.token_id
       JOIN networks ON networks.id = tokens.network_id
       WHERE organization_memberships.user_id = ? ${projectFilter}
       ORDER BY payments.created_at DESC
       LIMIT 10`
    ).bind(...bindings).all()
  ]);
  return context.json({
    data: {
      counts: counts ?? {
        totalPayments: 0,
        confirmedPayments: 0,
        pendingPayments: 0,
        failedPayments: 0
      },
      recentPayments: recentPayments.results
    }
  });
});

app.get("/dashboard/payments", async (context) => {
  const query = z.object({
    projectId: z.string().uuid().optional(),
    status: z.enum([
      "created",
      "pending",
      "detected",
      "confirming",
      "confirmed",
      "underpaid",
      "overpaid",
      "expired",
      "cancelled",
      "failed",
      "reorged"
    ]).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0)
  }).safeParse({
    projectId: context.req.query("projectId"),
    status: context.req.query("status"),
    search: context.req.query("search"),
    limit: context.req.query("limit"),
    offset: context.req.query("offset")
  });
  if (!query.success) return jsonError(context, "invalid_request", "Invalid dashboard payment filters.", 400);

  const userId = context.get("user").id;
  if (query.data.projectId) {
    const accessibleProject = await context.env.DB.prepare(
      `SELECT projects.id FROM projects
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       WHERE projects.id = ? AND organization_memberships.user_id = ?`
    ).bind(query.data.projectId, userId).first<{ id: string }>();
    if (!accessibleProject) return jsonError(context, "not_found", "Project not found.", 404);
  }

  const filters = ["organization_memberships.user_id = ?"];
  const bindings: (string | number)[] = [userId];
  if (query.data.projectId) {
    filters.push("projects.id = ?");
    bindings.push(query.data.projectId);
  }
  if (query.data.status) {
    filters.push("payments.status = ?");
    bindings.push(query.data.status);
  }
  if (query.data.search) {
    filters.push("(instr(lower(payments.id), lower(?)) > 0 OR instr(lower(COALESCE(payments.order_id, '')), lower(?)) > 0)");
    bindings.push(query.data.search, query.data.search);
  }
  const whereClause = filters.join(" AND ");
  const [payments, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT payments.id, payments.project_id AS projectId, payments.status,
              payments.amount_raw AS amountRaw, payments.amount_due_raw AS amountDueRaw,
              payments.order_id AS orderId, payments.receiving_address AS receivingAddress,
              payments.expires_at AS expiresAt, payments.created_at AS createdAt,
              tokens.symbol, tokens.decimals, networks.id AS networkId,
              projects.name AS projectName
       FROM payments
       JOIN projects ON projects.id = payments.project_id
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       JOIN tokens ON tokens.id = payments.token_id
       JOIN networks ON networks.id = tokens.network_id
       WHERE ${whereClause}
       ORDER BY payments.created_at DESC, payments.id DESC
       LIMIT ? OFFSET ?`
    ).bind(...bindings, query.data.limit, query.data.offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM payments
       JOIN projects ON projects.id = payments.project_id
       JOIN organization_memberships
         ON organization_memberships.organization_id = projects.organization_id
       WHERE ${whereClause}`
    ).bind(...bindings).first<{ count: number }>()
  ]);
  return context.json({
    data: payments.results,
    meta: {
      limit: query.data.limit,
      offset: query.data.offset,
      total: total?.count ?? 0
    }
  });
});

app.get("/dashboard/payments/:id", async (context) => {
  const paymentId = context.req.param("id");
  const payment = await context.env.DB.prepare(
    `SELECT payments.id, payments.project_id AS projectId, payments.status,
            payments.amount_raw AS amountRaw, payments.amount_due_raw AS amountDueRaw,
            payments.order_id AS orderId, payments.receiving_address AS receivingAddress,
            payments.expires_at AS expiresAt, payments.created_at AS createdAt,
            payments.updated_at AS updatedAt, tokens.symbol, tokens.name AS tokenName,
            tokens.decimals, networks.id AS networkId, projects.name AS projectName
     FROM payments
     JOIN projects ON projects.id = payments.project_id
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     JOIN tokens ON tokens.id = payments.token_id
     JOIN networks ON networks.id = tokens.network_id
     WHERE payments.id = ? AND organization_memberships.user_id = ?`
  ).bind(paymentId, context.get("user").id).first<{
    id: string;
    projectId: string;
    status: PaymentStatus;
    amountRaw: string;
    amountDueRaw: string;
    orderId: string | null;
    receivingAddress: string;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    symbol: string;
    tokenName: string;
    decimals: number;
    networkId: string;
    projectName: string;
  }>();
  if (!payment) return jsonError(context, "not_found", "Payment not found.", 404);

  const [events, transactions] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, event_type AS eventType, previous_status AS previousStatus,
              next_status AS nextStatus, payload, created_at AS createdAt
       FROM payment_events
       WHERE payment_id = ?
       ORDER BY created_at ASC, rowid ASC
       LIMIT 100`
    ).bind(paymentId).all<{
      id: string;
      eventType: string;
      previousStatus: string | null;
      nextStatus: string;
      payload: string;
      createdAt: string;
    }>(),
    context.env.DB.prepare(
      `SELECT blockchain_transactions.transaction_hash AS transactionHash,
              blockchain_transactions.block_height AS blockHeight,
              blockchain_transactions.success,
              blockchain_transactions.confirmations,
              blockchain_transactions.finality_status AS finalityStatus,
              transaction_observations.sender_address AS senderAddress,
              transaction_observations.recipient_address AS recipientAddress,
              transaction_observations.amount_raw AS amountRaw,
              transaction_observations.observed_at AS observedAt,
              payment_matches.match_status AS matchStatus
       FROM payment_matches
       JOIN transaction_observations ON transaction_observations.id = payment_matches.observation_id
       JOIN blockchain_transactions ON blockchain_transactions.id = transaction_observations.transaction_id
       WHERE payment_matches.payment_id = ?
       ORDER BY transaction_observations.observed_at ASC
       LIMIT 100`
    ).bind(paymentId).all()
  ]);
  return context.json({
    data: {
      payment,
      events: events.results.map((event) => ({
        ...event,
        payload: JSON.parse(event.payload) as unknown
      })),
      transactions: transactions.results
    }
  });
});

app.get("/projects", async (context) => {
  const projects = await context.env.DB.prepare(
    `SELECT projects.id, projects.name, projects.environment, projects.created_at AS createdAt
     FROM projects
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     WHERE organization_memberships.user_id = ?
     ORDER BY projects.created_at DESC`
  ).bind(context.get("user").id).all();
  return context.json({ data: projects.results });
});

app.post("/projects", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }
  const input = z.object({
    name: z.string().trim().min(1).max(120),
    environment: z.enum(["test", "live"])
  }).safeParse(await context.req.json().catch(() => null));
  if (!input.success) return jsonError(context, "invalid_request", "Invalid project details.", 400);

  const membership = await context.env.DB.prepare(
    `SELECT organizations.id AS organizationId
     FROM organization_memberships
     JOIN organizations ON organizations.id = organization_memberships.organization_id
     WHERE organization_memberships.user_id = ?
       AND organization_memberships.role IN ('owner', 'admin') LIMIT 1`
  ).bind(context.get("user").id).first<{ organizationId: string }>();
  if (!membership) return jsonError(context, "forbidden", "You cannot create projects.", 403);

  const project = {
    id: crypto.randomUUID(),
    name: input.data.name,
    environment: input.data.environment
  };
  try {
    await context.env.DB.prepare(
      "INSERT INTO projects (id, organization_id, name, environment) VALUES (?, ?, ?, ?)"
    ).bind(project.id, membership.organizationId, project.name, project.environment).run();
  } catch (error) {
    console.error("project creation failed", error);
    return jsonError(context, "project_creation_failed", "The project could not be created.", 500);
  }
  return context.json({ data: project }, 201);
});

app.get("/projects/:id", async (context) => {
  const project = await context.env.DB.prepare(
    `SELECT projects.id, projects.name, projects.environment,
            projects.created_at AS createdAt
     FROM projects
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     WHERE projects.id = ? AND organization_memberships.user_id = ?`
  ).bind(context.req.param("id"), context.get("user").id)
    .first<{ id: string; name: string; environment: string; createdAt: string }>();
  if (!project) return jsonError(context, "not_found", "Project not found.", 404);
  return context.json({ data: project });
});

app.patch("/projects/:id", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }
  const input = z.object({
    name: z.string().trim().min(1).max(120)
  }).strict().safeParse(await context.req.json().catch(() => null));
  if (!input.success) return jsonError(context, "invalid_request", "Invalid project details.", 400);

  const projectId = context.req.param("id");
  const current = await context.env.DB.prepare(
    `SELECT projects.id, projects.organization_id AS organizationId,
            projects.environment, organization_memberships.role
     FROM projects
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     WHERE projects.id = ? AND organization_memberships.user_id = ?`
  ).bind(projectId, context.get("user").id).first<{
    id: string;
    organizationId: string;
    environment: string;
    role: string;
  }>();
  if (!current) return jsonError(context, "not_found", "Project not found.", 404);
  if (current.role !== "owner" && current.role !== "admin") {
    return jsonError(context, "forbidden", "Only organization owners and admins can update projects.", 403);
  }

  const duplicate = await context.env.DB.prepare(
    `SELECT id FROM projects
     WHERE organization_id = ? AND environment = ? AND name = ? AND id != ?`
  ).bind(current.organizationId, current.environment, input.data.name, projectId)
    .first<{ id: string }>();
  if (duplicate) return jsonError(context, "project_name_in_use", "A project with this name already exists in this environment.", 409);

  try {
    await context.env.DB.prepare(
      "UPDATE projects SET name = ? WHERE id = ? AND organization_id = ?"
    ).bind(input.data.name, projectId, current.organizationId).run();
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return jsonError(context, "project_name_in_use", "A project with this name already exists in this environment.", 409);
    }
    console.error("project update failed", error);
    return jsonError(context, "project_update_failed", "The project could not be updated.", 500);
  }

  const updated = await context.env.DB.prepare(
    "SELECT id, name, environment, created_at AS createdAt FROM projects WHERE id = ?"
  ).bind(projectId).first();
  if (!updated) return jsonError(context, "not_found", "Project not found.", 404);
  return context.json({ data: updated });
});

app.use("/api-keys", requireSession);
app.use("/api-keys/*", requireSession);
app.get("/api-keys", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT api_keys.id, api_keys.project_id AS projectId, api_keys.key_prefix AS keyPrefix,
            api_keys.environment, api_keys.name, api_keys.permissions, api_keys.last_used_at AS lastUsedAt,
            api_keys.revoked_at AS revokedAt, api_keys.created_at AS createdAt
     FROM api_keys
     JOIN projects ON projects.id = api_keys.project_id
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     WHERE organization_memberships.user_id = ?
     ORDER BY api_keys.created_at DESC`
  ).bind(context.get("user").id).all<{ id: string; projectId: string; keyPrefix: string;
    environment: string; name: string; permissions: string; lastUsedAt: string | null;
    revokedAt: string | null; createdAt: string }>();
  return context.json({
    data: result.results.map((key) => ({
      ...key,
      permissions: z.array(permissionSchema).parse(JSON.parse(key.permissions))
    }))
  });
});

app.post("/api-keys", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }
  const input = z.object({
    projectId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
    permissions: z.array(permissionSchema).min(1).max(apiKeyPermissions.length)
  }).safeParse(await context.req.json().catch(() => null));
  if (!input.success) return jsonError(context, "invalid_request", "Invalid API key details.", 400);

  const project = await context.env.DB.prepare(
    `SELECT projects.id, projects.environment
     FROM projects
     JOIN organization_memberships
       ON organization_memberships.organization_id = projects.organization_id
     WHERE projects.id = ? AND organization_memberships.user_id = ?
       AND organization_memberships.role IN ('owner', 'admin', 'developer')`
  ).bind(input.data.projectId, context.get("user").id)
    .first<{ id: string; environment: "test" | "live" }>();
  if (!project) return jsonError(context, "not_found", "Project not found.", 404);

  const secret = `flxt_${project.environment}_${randomToken(32)}`;
  const id = crypto.randomUUID();
  await context.env.DB.prepare(
    `INSERT INTO api_keys
       (id, project_id, key_hash, key_prefix, environment, permissions, name)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    project.id,
    await sha256(secret),
    secret.slice(0, 14),
    project.environment,
    JSON.stringify([...new Set(input.data.permissions)]),
    input.data.name
  ).run();

  return context.json({
    data: {
      id,
      name: input.data.name,
      projectId: project.id,
      environment: project.environment,
      permissions: [...new Set(input.data.permissions)],
      secret
    }
  }, 201);
});

app.delete("/api-keys/:id", async (context) => {
  if (!isSameOriginMutation(context.req.raw)) {
    return jsonError(context, "origin_mismatch", "Request origin is not allowed.", 403);
  }
  const result = await context.env.DB.prepare(
    `UPDATE api_keys SET revoked_at = datetime('now')
     WHERE id = ? AND revoked_at IS NULL
       AND project_id IN (
         SELECT projects.id FROM projects
         JOIN organization_memberships
           ON organization_memberships.organization_id = projects.organization_id
         WHERE organization_memberships.user_id = ?
           AND organization_memberships.role IN ('owner', 'admin', 'developer')
       )`
  ).bind(context.req.param("id"), context.get("user").id).run();
  if (!result.meta.changes) return jsonError(context, "not_found", "API key not found.", 404);
  return context.body(null, 204);
});

app.use("/payments", requireApiKey);
app.use("/payments/*", requireApiKey);
app.use("/transactions", requireApiKey);
app.use("/transactions/*", requireApiKey);
app.use("/invoices", requireApiKey);
app.use("/invoices/*", requireApiKey);
app.use("/test/*", requireApiKey);

async function listPayments(context: Context<AppEnvironment>) {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:read")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:read permission.", 403);
  }
  const query = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0)
  }).safeParse({
    limit: context.req.query("limit"),
    offset: context.req.query("offset")
  });
  if (!query.success) return jsonError(context, "invalid_request", "Invalid pagination values.", 400);

  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT payments.id, payments.status, payments.amount_raw AS amountRaw,
              payments.amount_due_raw AS amountDueRaw, payments.order_id AS orderId,
              payments.token_id AS tokenId, tokens.symbol, tokens.decimals,
              networks.id AS networkId, payments.expires_at AS expiresAt,
              payments.created_at AS createdAt
       FROM payments
       JOIN tokens ON tokens.id = payments.token_id
       JOIN networks ON networks.id = tokens.network_id
       WHERE payments.project_id = ?
       ORDER BY payments.created_at DESC LIMIT ? OFFSET ?`
    ).bind(project.projectId, query.data.limit, query.data.offset).all(),
    context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM payments WHERE project_id = ?"
    ).bind(project.projectId).first<{ count: number }>()
  ]);
  return context.json({
    data: items.results,
    meta: {
      limit: query.data.limit,
      offset: query.data.offset,
      total: total?.count ?? 0
    }
  });
}

app.get("/payments", listPayments);
app.get("/invoices", listPayments);

async function retrievePayment(context: Context<AppEnvironment>) {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:read")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:read permission.", 403);
  }
  const paymentId = context.req.param("id");
  if (!paymentId) return jsonError(context, "not_found", "Payment not found.", 404);
  const payment = await getInvoice(context, project.projectId, paymentId);
  if (!payment) return jsonError(context, "not_found", "Payment not found.", 404);
  return context.json({ data: payment });
}

app.get("/payments/:id", retrievePayment);

app.get("/payments/:id/events", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:read")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:read permission.", 403);
  }
  const paymentId = context.req.param("id");
  if (!paymentId) return jsonError(context, "not_found", "Payment not found.", 404);
  const payment = await context.env.DB.prepare(
    "SELECT id FROM payments WHERE id = ? AND project_id = ?"
  ).bind(paymentId, project.projectId).first<{ id: string }>();
  if (!payment) return jsonError(context, "not_found", "Payment not found.", 404);

  const query = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0)
  }).safeParse({
    limit: context.req.query("limit"),
    offset: context.req.query("offset")
  });
  if (!query.success) return jsonError(context, "invalid_request", "Invalid pagination values.", 400);

  const [events, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, event_type AS eventType, previous_status AS previousStatus,
              next_status AS nextStatus, payload, created_at AS createdAt
       FROM payment_events
       WHERE payment_id = ?
       ORDER BY created_at ASC, rowid ASC
       LIMIT ? OFFSET ?`
    ).bind(paymentId, query.data.limit, query.data.offset)
      .all<{
        id: string;
        eventType: string;
        previousStatus: string | null;
        nextStatus: string;
        payload: string;
        createdAt: string;
      }>(),
    context.env.DB.prepare(
      "SELECT COUNT(*) AS count FROM payment_events WHERE payment_id = ?"
    ).bind(paymentId).first<{ count: number }>()
  ]);
  return context.json({
    data: events.results.map((event) => ({
      ...event,
      payload: JSON.parse(event.payload) as unknown
    })),
    meta: {
      limit: query.data.limit,
      offset: query.data.offset,
      total: total?.count ?? 0
    }
  });
});

async function listTransactions(context: Context<AppEnvironment>) {
  const project = context.get("project");
  if (!project.permissions.includes("transactions:read")) {
    return jsonError(context, "forbidden", "The API key lacks transactions:read permission.", 403);
  }
  const query = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).max(100_000).default(0),
    networkId: z.string().min(1).max(128).optional()
  }).safeParse({
    limit: context.req.query("limit"),
    offset: context.req.query("offset"),
    networkId: context.req.query("networkId")
  });
  if (!query.success) return jsonError(context, "invalid_request", "Invalid transaction filters.", 400);

  const networkFilter = query.data.networkId ? "AND networks.id = ?" : "";
  const bindings = query.data.networkId
    ? [project.projectId, query.data.networkId]
    : [project.projectId];
  const [items, total] = await Promise.all([
    context.env.DB.prepare(
      `SELECT blockchain_transactions.transaction_hash AS transactionHash,
              networks.id AS networkId, blockchain_transactions.block_height AS blockHeight,
              blockchain_transactions.block_hash AS blockHash,
              blockchain_transactions.success,
              blockchain_transactions.confirmations,
              blockchain_transactions.finality_status AS finalityStatus,
              networks.family AS networkFamily,
              transaction_observations.sender_address AS senderAddress,
              transaction_observations.recipient_address AS recipientAddress,
              transaction_observations.amount_raw AS amountRaw,
              tokens.id AS tokenId, tokens.symbol, tokens.decimals,
              payments.id AS paymentId, payment_matches.match_status AS matchStatus,
              blockchain_transactions.created_at AS observedAt
       FROM payments
       JOIN payment_matches ON payment_matches.payment_id = payments.id
       JOIN transaction_observations
         ON transaction_observations.id = payment_matches.observation_id
       JOIN blockchain_transactions
         ON blockchain_transactions.id = transaction_observations.transaction_id
       JOIN networks ON networks.id = blockchain_transactions.network_id
       JOIN tokens ON tokens.id = transaction_observations.token_id
       WHERE payments.project_id = ? ${networkFilter}
       ORDER BY blockchain_transactions.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(...bindings, query.data.limit, query.data.offset).all(),
    context.env.DB.prepare(
      `SELECT COUNT(*) AS count
       FROM payments
       JOIN payment_matches ON payment_matches.payment_id = payments.id
       JOIN transaction_observations
         ON transaction_observations.id = payment_matches.observation_id
       JOIN blockchain_transactions
         ON blockchain_transactions.id = transaction_observations.transaction_id
       JOIN networks ON networks.id = blockchain_transactions.network_id
       WHERE payments.project_id = ? ${networkFilter}`
    ).bind(...bindings).first<{ count: number }>()
  ]);
  return context.json({
    data: items.results.map((transaction) => ({
      ...transaction,
      success: transaction.success === 1,
      simulated: transaction.networkFamily === "test-simulator"
    })),
    meta: {
      limit: query.data.limit,
      offset: query.data.offset,
      total: total?.count ?? 0
    }
  });
}

app.get("/transactions", listTransactions);

app.get("/transactions/:hash", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("transactions:read")) {
    return jsonError(context, "forbidden", "The API key lacks transactions:read permission.", 403);
  }
  const networkId = context.req.query("networkId");
  if (networkId && networkId.length > 128) {
    return jsonError(context, "invalid_request", "Invalid network filter.", 400);
  }
  const networkFilter = networkId ? "AND networks.id = ?" : "";
  const bindings = networkId
    ? [project.projectId, context.req.param("hash"), networkId]
    : [project.projectId, context.req.param("hash")];
  const result = await context.env.DB.prepare(
    `SELECT blockchain_transactions.transaction_hash AS transactionHash,
            networks.id AS networkId, blockchain_transactions.block_height AS blockHeight,
            blockchain_transactions.block_hash AS blockHash,
            blockchain_transactions.success,
            blockchain_transactions.confirmations,
            blockchain_transactions.finality_status AS finalityStatus,
            networks.family AS networkFamily,
            transaction_observations.sender_address AS senderAddress,
            transaction_observations.recipient_address AS recipientAddress,
            transaction_observations.amount_raw AS amountRaw,
            tokens.id AS tokenId, tokens.symbol, tokens.decimals,
            payments.id AS paymentId, payment_matches.match_status AS matchStatus,
            blockchain_transactions.created_at AS observedAt
     FROM payments
     JOIN payment_matches ON payment_matches.payment_id = payments.id
     JOIN transaction_observations
       ON transaction_observations.id = payment_matches.observation_id
     JOIN blockchain_transactions
       ON blockchain_transactions.id = transaction_observations.transaction_id
     JOIN networks ON networks.id = blockchain_transactions.network_id
     JOIN tokens ON tokens.id = transaction_observations.token_id
     WHERE payments.project_id = ?
       AND blockchain_transactions.transaction_hash = ? ${networkFilter}
     ORDER BY blockchain_transactions.created_at DESC
     LIMIT 100`
  ).bind(...bindings).all();
  if (!result.results.length) {
    return jsonError(context, "not_found", "Transaction not found.", 404);
  }
  return context.json({
    data: result.results.map((transaction) => ({
      ...transaction,
      success: transaction.success === 1,
      simulated: transaction.networkFamily === "test-simulator"
    }))
  });
});

app.post("/invoices", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:write")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:write permission.", 403);
  }

  const input = z.object({
    amount: z.string().regex(/^(0|[1-9]\d*)(?:\.\d+)?$/).max(80),
    tokenId: z.string().min(1).max(128),
    networkId: z.string().min(1).max(128),
    receivingAddress: z.string().trim().min(1).max(256).optional(),
    orderId: z.string().max(256).optional(),
    expiresInSeconds: z.number().int().min(60).max(7 * 24 * 60 * 60).default(1800)
  }).safeParse(await context.req.json().catch(() => null));
  if (!input.success) {
    return jsonError(context, "invalid_request", "Invoice details are invalid.", 400);
  }

  const idempotencyKey = context.req.header("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return jsonError(context, "idempotency_key_required", "Provide a valid Idempotency-Key header.", 400);
  }

  const configuredAsset = await context.env.DB.prepare(
    `SELECT tokens.id AS tokenId, tokens.decimals, tokens.enabled AS tokenEnabled,
            networks.id AS networkId, networks.enabled AS networkEnabled,
            networks.family, networks.name AS networkName,
            networks.support_status AS supportStatus
     FROM tokens
     JOIN networks ON networks.id = tokens.network_id
     WHERE tokens.id = ? AND networks.id = ?`
  ).bind(input.data.tokenId, input.data.networkId).first<{
    tokenId: string;
    decimals: number;
    tokenEnabled: number;
    networkId: string;
    networkEnabled: number;
    family: string;
    networkName: string;
    supportStatus: string;
  }>();

  const simulatorOnly = configuredAsset?.family === "test-simulator";
  const simulatorAllowed = simulatorOnly
    && project.environment === "test"
    && configuredAsset?.networkId === "local-test-simulator";
  if (
    !configuredAsset
    || configuredAsset.tokenEnabled !== 1
    || configuredAsset.networkEnabled !== 1
    || (!simulatorAllowed && (
      configuredAsset.supportStatus !== "SUPPORTED"
      || !isNetworkVerified(configuredAsset.networkId)
    ))
  ) {
    return jsonError(
      context,
      "network_not_available",
      "Invoices can only be created for enabled networks with a verified payment adapter.",
      422
    );
  }

  let amountDue: bigint;
  try {
    amountDue = parseUnits(input.data.amount, configuredAsset.decimals);
  } catch {
    return jsonError(context, "invalid_amount", "Amount does not match the token's supported precision.", 400);
  }
  if (amountDue <= 0n) {
    return jsonError(context, "invalid_amount", "Amount must be greater than zero.", 400);
  }

  const canonicalInput = JSON.stringify({
    ...input.data,
    amount: amountDue.toString()
  });
  const requestHash = await sha256(canonicalInput);
  const existing = await context.env.DB.prepare(
    "SELECT id, idempotency_hash FROM payments WHERE project_id = ? AND idempotency_key = ?"
  ).bind(project.projectId, idempotencyKey).first<{
    id: string;
    idempotency_hash: string | null;
  }>();
  if (existing) {
    if (existing.idempotency_hash !== requestHash) {
      return jsonError(context, "idempotency_conflict", "This Idempotency-Key was already used with different invoice details.", 409);
    }
    return context.json({ data: await getInvoice(context, project.projectId, existing.id) });
  }

  const id = `pay_${crypto.randomUUID().replaceAll("-", "")}`;
  const expiresAt = new Date(Date.now() + input.data.expiresInSeconds * 1000).toISOString();
  const receivingAddress = simulatorAllowed
    ? `sim_${crypto.randomUUID().replaceAll("-", "")}`
    : input.data.receivingAddress;
  if (!receivingAddress) {
    return jsonError(context, "invalid_request", "A receiving address is required.", 400);
  }
  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `INSERT INTO payments
           (id, project_id, token_id, status, amount_raw, amount_due_raw,
            order_id, receiving_address, idempotency_key, idempotency_hash, expires_at)
         VALUES (?, ?, ?, 'pending', '0', ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        project.projectId,
        configuredAsset.tokenId,
        amountDue.toString(),
        input.data.orderId ?? null,
        receivingAddress,
        idempotencyKey,
        requestHash,
        expiresAt
      ),
      context.env.DB.prepare(
        `INSERT INTO payment_events (id, payment_id, event_type, next_status, payload)
         VALUES (?, ?, 'invoice.created', 'pending', ?)`
      ).bind(crypto.randomUUID(), id, JSON.stringify({
        id,
        amount: input.data.amount,
        tokenId: configuredAsset.tokenId,
        networkId: configuredAsset.networkId,
        orderId: input.data.orderId ?? null
      }))
    ]);
  } catch (error) {
    const raced = await context.env.DB.prepare(
      "SELECT id, idempotency_hash FROM payments WHERE project_id = ? AND idempotency_key = ?"
    ).bind(project.projectId, idempotencyKey).first<{
      id: string;
      idempotency_hash: string | null;
    }>();
    if (raced) {
      if (raced.idempotency_hash !== requestHash) {
        return jsonError(context, "idempotency_conflict", "This Idempotency-Key was already used with different invoice details.", 409);
      }
      return context.json({ data: await getInvoice(context, project.projectId, raced.id) });
    }
    console.error("invoice creation failed", error);
    return jsonError(context, "invoice_creation_failed", "The invoice could not be created.", 500);
  }

  return context.json({ data: await getInvoice(context, project.projectId, id) }, 201);
});

async function getInvoice(
  context: Context<AppEnvironment>,
  projectId: string,
  invoiceId: string
) {
  return context.env.DB.prepare(
    `SELECT payments.id, payments.status, payments.amount_raw AS amountRaw,
            payments.amount_due_raw AS amountDueRaw, payments.order_id AS orderId,
            payments.receiving_address AS receivingAddress,
            payments.token_id AS tokenId, payments.expires_at AS expiresAt,
            payments.created_at AS createdAt
     FROM payments
     WHERE payments.project_id = ? AND payments.id = ?`
  ).bind(projectId, invoiceId).first();
}

app.get("/invoices/:id", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:read")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:read permission.", 403);
  }
  const invoice = await getInvoice(context, project.projectId, context.req.param("id"));
  if (!invoice) return jsonError(context, "not_found", "Invoice not found.", 404);
  return context.json({ data: invoice });
});

app.post("/invoices/:id/expire", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:write")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:write permission.", 403);
  }
  const invoiceId = context.req.param("id");
  const current = await context.env.DB.prepare(
    "SELECT status, revision FROM payments WHERE id = ? AND project_id = ?"
  ).bind(invoiceId, project.projectId).first<{ status: string; revision: number }>();
  if (!current) return jsonError(context, "not_found", "Invoice not found.", 404);
  if (current.status === "expired") {
    return context.json({ data: await getInvoice(context, project.projectId, invoiceId) });
  }
  if (current.status !== "pending") {
    return jsonError(context, "invalid_state", "Only pending invoices can be expired.", 409);
  }

  try {
    const results = await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE payments
         SET status = 'expired', revision = revision + 1, updated_at = datetime('now')
         WHERE id = ? AND project_id = ? AND status = 'pending' AND revision = ?`
      ).bind(invoiceId, project.projectId, current.revision),
      context.env.DB.prepare(
        `INSERT INTO payment_revision_claims (payment_id, revision)
         SELECT payments.id, payments.revision FROM payments
         WHERE payments.id = ? AND payments.project_id = ?
           AND payments.status = 'expired' AND payments.revision = ?`
      ).bind(invoiceId, project.projectId, current.revision + 1),
      context.env.DB.prepare(
        `INSERT INTO payment_events (id, payment_id, event_type, previous_status, next_status)
         SELECT ?, payment_id, 'payment.expired', 'pending', 'expired'
         FROM payment_revision_claims WHERE payment_id = ? AND revision = ?`
      ).bind(crypto.randomUUID(), invoiceId, current.revision + 1)
    ]);
    if (!results[0].meta.changes) {
      return jsonError(context, "invalid_state", "Invoice state changed; retrieve it before retrying.", 409);
    }
  } catch (error) {
    const updated = await context.env.DB.prepare(
      "SELECT status FROM payments WHERE id = ? AND project_id = ?"
    ).bind(invoiceId, project.projectId).first<{ status: string }>();
    if (updated?.status !== "expired") {
      console.error("invoice expiration failed", error);
      return jsonError(context, "expiration_failed", "The invoice could not be expired.", 500);
    }
  }
  const updated = await getInvoice(context, project.projectId, invoiceId);
  if (!updated) {
    return jsonError(context, "invalid_state", "Invoice state changed; retrieve it before retrying.", 409);
  }
  return context.json({ data: updated });
});

app.post("/payments/:id/cancel", async (context) => {
  const project = context.get("project");
  if (!project.permissions.includes("invoices:write")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:write permission.", 403);
  }

  const paymentId = context.req.param("id");
  const current = await context.env.DB.prepare(
    "SELECT status, revision FROM payments WHERE id = ? AND project_id = ?"
  ).bind(paymentId, project.projectId).first<{ status: string; revision: number }>();
  if (!current) return jsonError(context, "not_found", "Payment not found.", 404);
  if (current.status === "cancelled") {
    return context.json({ data: await getInvoice(context, project.projectId, paymentId) });
  }
  if (current.status !== "created" && current.status !== "pending") {
    return jsonError(context, "invalid_state", "Only unpaid payments can be cancelled.", 409);
  }

  try {
    const results = await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE payments
         SET status = 'cancelled', revision = revision + 1, updated_at = datetime('now')
         WHERE id = ? AND project_id = ? AND status = ? AND revision = ?`
      ).bind(paymentId, project.projectId, current.status, current.revision),
      context.env.DB.prepare(
        `INSERT INTO payment_revision_claims (payment_id, revision)
         SELECT payments.id, payments.revision FROM payments
         WHERE payments.id = ? AND payments.project_id = ?
           AND payments.status = 'cancelled' AND payments.revision = ?`
      ).bind(paymentId, project.projectId, current.revision + 1),
      context.env.DB.prepare(
        `INSERT INTO payment_events (id, payment_id, event_type, previous_status, next_status)
         SELECT ?, payment_id, 'payment.cancelled', ?, 'cancelled'
         FROM payment_revision_claims WHERE payment_id = ? AND revision = ?`
      ).bind(crypto.randomUUID(), current.status, paymentId, current.revision + 1)
    ]);

    if (!results[0].meta.changes) {
      const latest = await context.env.DB.prepare(
        "SELECT status FROM payments WHERE id = ? AND project_id = ?"
      ).bind(paymentId, project.projectId).first<{ status: string }>();
      if (latest?.status === "cancelled") {
        return context.json({ data: await getInvoice(context, project.projectId, paymentId) });
      }
      return jsonError(context, "invalid_state", "Payment state changed; retrieve it before retrying.", 409);
    }
  } catch (error) {
    const latest = await context.env.DB.prepare(
      "SELECT status FROM payments WHERE id = ? AND project_id = ?"
    ).bind(paymentId, project.projectId).first<{ status: string }>();
    if (latest?.status !== "cancelled") {
      console.error("payment cancellation failed", error);
      return jsonError(context, "cancellation_failed", "The payment could not be cancelled.", 500);
    }
  }

  const updated = await getInvoice(context, project.projectId, paymentId);
  if (!updated) return jsonError(context, "not_found", "Payment not found.", 404);
  return context.json({ data: updated });
});

app.post("/test/simulate-transfer", async (context) => {
  const project = context.get("project");
  if (project.environment !== "test") {
    return jsonError(context, "test_environment_required", "Simulated transfers are only available in test projects.", 403);
  }
  if (!project.permissions.includes("invoices:write")) {
    return jsonError(context, "forbidden", "The API key lacks invoices:write permission.", 403);
  }

  const idempotencyKey = context.req.header("idempotency-key");
  if (!idempotencyKey || idempotencyKey.length > 255) {
    return jsonError(context, "idempotency_key_required", "Provide a valid Idempotency-Key header.", 400);
  }
  const input = z.object({
    invoiceId: z.string().min(1).max(128),
    amount: z.string().regex(/^(0|[1-9]\d*)(?:\.\d+)?$/).max(80)
  }).safeParse(await context.req.json().catch(() => null));
  if (!input.success) return jsonError(context, "invalid_request", "Transfer details are invalid.", 400);

  const invoice = await context.env.DB.prepare(
    `SELECT payments.id, payments.status, payments.amount_raw, payments.amount_due_raw,
            payments.revision,
            payments.token_id, payments.receiving_address, tokens.decimals,
            networks.id AS networkId, networks.family
     FROM payments
     JOIN tokens ON tokens.id = payments.token_id
     JOIN networks ON networks.id = tokens.network_id
     WHERE payments.id = ? AND payments.project_id = ?`
  ).bind(input.data.invoiceId, project.projectId).first<{
    id: string;
    status: string;
    amount_raw: string;
    amount_due_raw: string;
    revision: number;
    token_id: string;
    receiving_address: string;
    decimals: number;
    networkId: string;
    family: string;
  }>();
  if (!invoice) return jsonError(context, "not_found", "Invoice not found.", 404);
  if (invoice.networkId !== "local-test-simulator" || invoice.family !== "test-simulator") {
    return jsonError(context, "simulator_invoice_required", "Only invoices on the local test simulator can receive simulated transfers.", 422);
  }

  let amountRaw: bigint;
  try {
    amountRaw = parseUnits(input.data.amount, invoice.decimals);
  } catch {
    return jsonError(context, "invalid_amount", "Amount does not match the test asset precision.", 400);
  }
  if (amountRaw <= 0n) {
    return jsonError(context, "invalid_amount", "Amount must be greater than zero.", 400);
  }

  const transactionHash = `sim_${await sha256(
    `${project.projectId}:${idempotencyKey}`
  )}`;
  const previous = await context.env.DB.prepare(
    `SELECT blockchain_transactions.id, transaction_observations.amount_raw,
            payment_matches.payment_id AS paymentId
     FROM blockchain_transactions
     JOIN transaction_observations
       ON transaction_observations.transaction_id = blockchain_transactions.id
     JOIN payment_matches
       ON payment_matches.observation_id = transaction_observations.id
     WHERE blockchain_transactions.network_id = ?
       AND blockchain_transactions.transaction_hash = ?`
  ).bind(invoice.networkId, transactionHash).first<{
    amount_raw: string;
    paymentId: string;
  }>();
  if (previous) {
    if (
      previous.amount_raw !== amountRaw.toString()
      || previous.paymentId !== invoice.id
    ) {
      return jsonError(context, "idempotency_conflict", "This Idempotency-Key was already used with different transfer details.", 409);
    }
    return context.json({
      data: {
        transactionHash,
        simulated: true,
        invoice: await getInvoice(context, project.projectId, invoice.id)
      }
    });
  }

  const totalReceived = BigInt(invoice.amount_raw) + amountRaw;
  const amountDue = BigInt(invoice.amount_due_raw);
  const targetStatus = totalReceived < amountDue
    ? "underpaid"
    : totalReceived > amountDue
      ? "overpaid"
      : "confirmed";
  let currentStatus = invoice.status as PaymentStatus;
  const statusEvents: {
    type: string;
    previousStatus: string;
    nextStatus: string;
  }[] = [];

  if (["pending", "expired", "cancelled", "reorged"].includes(currentStatus)) {
    statusEvents.push({
      type: "payment.detected",
      previousStatus: currentStatus,
      nextStatus: "detected"
    });
    currentStatus = "detected";
  }
  if (currentStatus !== targetStatus) {
    if (!canTransitionPayment(currentStatus, targetStatus)) {
      return jsonError(context, "invalid_state", "The invoice cannot accept another simulated transfer in its current state.", 409);
    }
    statusEvents.push({
      type: `payment.${targetStatus}`,
      previousStatus: currentStatus,
      nextStatus: targetStatus
    });
  }

  const transactionId = crypto.randomUUID();
  const observationId = crypto.randomUUID();
  const statements = [
    context.env.DB.prepare(
      `UPDATE payments
       SET amount_raw = ?, status = ?, revision = revision + 1, updated_at = datetime('now')
       WHERE id = ? AND project_id = ? AND amount_raw = ? AND status = ? AND revision = ?`
    ).bind(
      totalReceived.toString(),
      targetStatus,
      invoice.id,
      project.projectId,
      invoice.amount_raw,
      invoice.status,
      invoice.revision
    ),
    context.env.DB.prepare(
      `INSERT INTO payment_revision_claims (payment_id, revision)
       SELECT payments.id, payments.revision FROM payments
       WHERE payments.id = ? AND payments.project_id = ?
         AND payments.amount_raw = ? AND payments.status = ? AND payments.revision = ?`
    ).bind(
      invoice.id,
      project.projectId,
      totalReceived.toString(),
      targetStatus,
      invoice.revision + 1
    ),
    context.env.DB.prepare(
      `INSERT INTO blockchain_transactions
         (id, network_id, transaction_hash, success, confirmations, finality_status)
       SELECT ?, ?, ?, 1, 1, 'finalized'
       WHERE EXISTS (
         SELECT 1 FROM payment_revision_claims
         WHERE payment_id = ? AND revision = ?
       )`
    ).bind(
      transactionId,
      invoice.networkId,
      transactionHash,
      invoice.id,
      invoice.revision + 1
    ),
    context.env.DB.prepare(
      `INSERT INTO transaction_observations
         (id, transaction_id, token_id, sender_address, recipient_address, amount_raw)
       SELECT ?, ?, ?, 'local-simulator', ?, ?
       WHERE EXISTS (SELECT 1 FROM blockchain_transactions WHERE id = ?)`
    ).bind(
      observationId,
      transactionId,
      invoice.token_id,
      invoice.receiving_address,
      amountRaw.toString(),
      transactionId
    ),
    context.env.DB.prepare(
      `INSERT INTO payment_matches (payment_id, observation_id, match_status)
       SELECT ?, ?, 'matched'
       WHERE EXISTS (SELECT 1 FROM transaction_observations WHERE id = ?)`
    ).bind(invoice.id, observationId, observationId)
  ];
  for (const event of statusEvents) {
    statements.push(context.env.DB.prepare(
      `INSERT INTO payment_events
         (id, payment_id, event_type, previous_status, next_status, payload)
       SELECT ?, ?, ?, ?, ?, ?
       WHERE EXISTS (SELECT 1 FROM blockchain_transactions WHERE id = ?)`
    ).bind(
      crypto.randomUUID(),
      invoice.id,
      event.type,
      event.previousStatus,
      event.nextStatus,
      JSON.stringify({
        transactionHash,
        amountRaw: amountRaw.toString(),
        totalReceivedRaw: totalReceived.toString(),
        simulated: true
      }),
      transactionId
    ));
  }

  try {
    const results = await context.env.DB.batch(statements);
    if (!results[2].meta.changes) {
      return jsonError(context, "invoice_changed", "Invoice state changed while processing; retry with a new Idempotency-Key.", 409);
    }
  } catch (error) {
    const raced = await context.env.DB.prepare(
      `SELECT transaction_observations.amount_raw,
              payment_matches.payment_id AS paymentId
       FROM blockchain_transactions
       JOIN transaction_observations
         ON transaction_observations.transaction_id = blockchain_transactions.id
       JOIN payment_matches
         ON payment_matches.observation_id = transaction_observations.id
       WHERE blockchain_transactions.network_id = ?
         AND blockchain_transactions.transaction_hash = ?`
    ).bind(invoice.networkId, transactionHash).first<{
      amount_raw: string;
      paymentId: string;
    }>();
    if (raced?.amount_raw === amountRaw.toString() && raced.paymentId === invoice.id) {
      return context.json({
        data: {
          transactionHash,
          simulated: true,
          invoice: await getInvoice(context, project.projectId, invoice.id)
        }
      });
    }
    const current = await context.env.DB.prepare(
      "SELECT revision FROM payments WHERE id = ? AND project_id = ?"
    ).bind(invoice.id, project.projectId).first<{ revision: number }>();
    if (current && current.revision !== invoice.revision) {
      return jsonError(context, "invoice_changed", "Invoice state changed while processing; retry with a new Idempotency-Key.", 409);
    }
    console.error("test transfer processing failed", error);
    return jsonError(context, "transfer_processing_failed", "The simulated transfer could not be processed.", 500);
  }

  return context.json({
    data: {
      transactionHash,
      simulated: true,
      invoice: await getInvoice(context, project.projectId, invoice.id)
    }
  }, 201);
});

app.notFound((context) => context.json({
  error: {
    code: "not_found",
    message: "The requested resource was not found."
  },
  requestId: context.res.headers.get("x-request-id")
}, 404));

export default app;

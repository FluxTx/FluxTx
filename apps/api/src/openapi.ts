const errorResponse = {
  description: "Request failed.",
  content: {
    "application/json": {
      schema: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: { type: "string" },
              message: { type: "string" }
            }
          }
        }
      }
    }
  }
} as const;

const invoice = {
  type: "object",
  required: ["id", "status", "amountRaw", "amountDueRaw", "tokenId", "expiresAt"],
  properties: {
    id: { type: "string", example: "pay_..." },
    status: {
      type: "string",
      enum: [
        "created", "pending", "detected", "confirming", "confirmed", "underpaid",
        "overpaid", "expired", "cancelled", "failed", "reorged"
      ]
    },
    amountRaw: { type: "string", description: "Amount received in integer token base units." },
    amountDueRaw: { type: "string", description: "Amount due in integer token base units." },
    orderId: { type: ["string", "null"] },
    receivingAddress: { type: "string" },
    tokenId: { type: "string" },
    expiresAt: { type: "string", format: "date-time" },
    createdAt: { type: "string", format: "date-time" }
  }
} as const;

const apiKeySecurity = [{ bearerApiKey: [] }];
const sessionSecurity = [{ sessionCookie: [] }];
const jsonBody = (schema: object) => ({
  required: true,
  content: { "application/json": { schema } }
});
const jsonResponse = (
  description: string,
  schema: object = { type: "object" },
  status = "200"
) => ({
  [status]: status === "204"
    ? { description }
    : {
        description,
        content: { "application/json": { schema } }
      },
  "4XX": errorResponse,
  "5XX": errorResponse
});

export const openApiDocument: Record<string, unknown> = {
  openapi: "3.1.0",
  info: {
    title: "FluxTx API",
    version: "0.1.0",
    description: "Implemented API surface. Actual blockchain payment processing is not yet available."
  },
  servers: [{ url: "/v1" }],
  tags: [
    { name: "Health" },
    { name: "Networks" },
    { name: "Authentication" },
    { name: "Projects" },
    { name: "Dashboard" },
    { name: "API keys" },
    { name: "Invoices" },
    { name: "Transactions" },
    { name: "Test simulator" }
  ],
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Check API health",
        responses: jsonResponse("Worker is healthy.", {
          type: "object",
          required: ["status"],
          properties: { status: { const: "ok" } }
        })
      }
    },
    "/networks": {
      get: {
        tags: ["Networks"],
        summary: "List network capability statuses",
        description: "A listed network is not necessarily implemented. Current network statuses are PLANNED.",
        responses: jsonResponse("Network catalogue.", {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: { type: "array", items: { type: "object" } },
            meta: { type: "object" }
          }
        })
      }
    },
    "/tokens": {
      get: {
        tags: ["Networks"],
        summary: "List enabled token configurations",
        description: "Only enabled assets on enabled networks are returned. The local simulator asset is marked testOnly and has no monetary value.",
        responses: jsonResponse("Enabled token catalogue.", {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: { type: "array", items: { type: "object" } },
            meta: { type: "object" }
          }
        })
      }
    },
    "/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register an account and default test project",
        description: "Requires a same-origin Origin header. Email verification is not implemented.",
        parameters: [{ $ref: "#/components/parameters/Origin" }],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password", "organizationName"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 12, maxLength: 128 },
            organizationName: { type: "string", minLength: 1, maxLength: 120 }
          }
        }),
        responses: jsonResponse("Account created and browser session set.", {
          type: "object",
          properties: { data: { type: "object" } }
        }, "201")
      }
    },
    "/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Start a browser session",
        parameters: [{ $ref: "#/components/parameters/Origin" }],
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 1, maxLength: 128 }
          }
        }),
        responses: jsonResponse("Authenticated and browser session set.", {
          type: "object",
          properties: { data: { type: "object" } }
        })
      }
    },
    "/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Read the current session",
        security: sessionSecurity,
        responses: jsonResponse("Current user.")
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "End the current session",
        security: sessionSecurity,
        parameters: [{ $ref: "#/components/parameters/Origin" }],
        responses: jsonResponse("Session ended.")
      }
    },
    "/projects": {
      get: {
        tags: ["Projects"],
        summary: "List accessible projects",
        security: sessionSecurity,
        responses: jsonResponse("Project list.")
      },
      post: {
        tags: ["Projects"],
        summary: "Create a project",
        security: sessionSecurity,
        parameters: [{ $ref: "#/components/parameters/Origin" }],
        requestBody: jsonBody({
          type: "object",
          required: ["name", "environment"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 120 },
            environment: { type: "string", enum: ["test", "live"] }
          }
        }),
        responses: jsonResponse("Project created.", { type: "object" }, "201")
      }
    },
    "/dashboard/overview": {
      get: {
        tags: ["Dashboard"],
        summary: "Read real payment counts and recent payments for accessible projects",
        description: "Counts are not converted across tokens or reported as fiat volume. Optional projectId must belong to the current user.",
        security: sessionSecurity,
        parameters: [{
          name: "projectId",
          in: "query",
          schema: { type: "string", format: "uuid" }
        }],
        responses: jsonResponse("Dashboard overview from persisted payment data.")
      }
    },
    "/dashboard/payments": {
      get: {
        tags: ["Dashboard"],
        summary: "List payments visible to the current user",
        description: "Supports pagination, project and status filters, and case-insensitive search by payment ID or order ID.",
        security: sessionSecurity,
        parameters: [
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Offset" },
          {
            name: "projectId",
            in: "query",
            schema: { type: "string", format: "uuid" }
          },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["created", "pending", "detected", "confirming", "confirmed", "underpaid", "overpaid", "expired", "cancelled", "failed", "reorged"]
            }
          },
          {
            name: "search",
            in: "query",
            schema: { type: "string", minLength: 1, maxLength: 100 }
          }
        ],
        responses: jsonResponse("Paginated payments visible to the current user.")
      }
    },
    "/dashboard/payments/{id}": {
      get: {
        tags: ["Dashboard"],
        summary: "Read a payment with event and transaction history",
        description: "The payment must belong to a project accessible to the current session.",
        security: sessionSecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" }
        }],
        responses: jsonResponse("Payment, persisted state events, and matched observations.")
      }
    },
    "/projects/{id}": {
      get: {
        tags: ["Projects"],
        summary: "Retrieve an accessible project",
        security: sessionSecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string", format: "uuid" }
        }],
        responses: jsonResponse("Project details.")
      },
      patch: {
        tags: ["Projects"],
        summary: "Rename a project",
        description: "Only organization owners and admins can update project names. Project environment cannot be changed.",
        security: sessionSecurity,
        parameters: [
          { $ref: "#/components/parameters/Origin" },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" }
          }
        ],
        requestBody: jsonBody({
          type: "object",
          required: ["name"],
          additionalProperties: false,
          properties: { name: { type: "string", minLength: 1, maxLength: 120 } }
        }),
        responses: jsonResponse("Project updated.")
      }
    },
    "/api-keys": {
      get: {
        tags: ["API keys"],
        summary: "List API key metadata",
        description: "Secret key values are never returned by this operation.",
        security: sessionSecurity,
        responses: jsonResponse("API key metadata.")
      },
      post: {
        tags: ["API keys"],
        summary: "Create an API key",
        description: "The secret is returned only once.",
        security: sessionSecurity,
        parameters: [{ $ref: "#/components/parameters/Origin" }],
        requestBody: jsonBody({
          type: "object",
          required: ["projectId", "name", "permissions"],
          properties: {
            projectId: { type: "string", format: "uuid" },
            name: { type: "string", minLength: 1, maxLength: 120 },
            permissions: {
              type: "array",
              minItems: 1,
              items: { type: "string", enum: [
                "invoices:read", "invoices:write", "transactions:read",
                "webhooks:read", "webhooks:write"
              ] }
            }
          }
        }),
        responses: jsonResponse("API key created; secret shown once.", {
          type: "object",
          properties: { data: { type: "object" } }
        }, "201")
      }
    },
    "/api-keys/{id}": {
      delete: {
        tags: ["API keys"],
        summary: "Revoke an API key",
        security: sessionSecurity,
        parameters: [
          { $ref: "#/components/parameters/Origin" },
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: jsonResponse("API key revoked.", undefined, "204")
      }
    },
    "/payments": {
      get: {
        tags: ["Invoices"],
        summary: "List project payments",
        security: apiKeySecurity,
        parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Offset" }],
        responses: jsonResponse("Payment list.")
      }
    },
    "/payments/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Retrieve a project payment",
        security: apiKeySecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" }
        }],
        responses: jsonResponse("Payment details.")
      }
    },
    "/payments/{id}/events": {
      get: {
        tags: ["Invoices"],
        summary: "List events for a project payment",
        security: apiKeySecurity,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Offset" }
        ],
        responses: jsonResponse("Payment event history.")
      }
    },
    "/payments/{id}/cancel": {
      post: {
        tags: ["Invoices"],
        summary: "Cancel an unpaid payment",
        description: "Only payments in created or pending state can be cancelled. Repeated cancellation is idempotent.",
        security: apiKeySecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" }
        }],
        responses: jsonResponse("Payment cancelled or already cancelled.")
      }
    },
    "/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "List transaction observations for this project",
        description: "Returns only observations associated with invoices in the API key's project.",
        security: apiKeySecurity,
        parameters: [
          { $ref: "#/components/parameters/Limit" },
          { $ref: "#/components/parameters/Offset" },
          {
            name: "networkId",
            in: "query",
            schema: { type: "string", maxLength: 128 }
          }
        ],
        responses: jsonResponse("Transaction observations.")
      }
    },
    "/transactions/{hash}": {
      get: {
        tags: ["Transactions"],
        summary: "Retrieve project transaction observations by hash",
        description: "If multiple networks use this hash, pass networkId to select one network.",
        security: apiKeySecurity,
        parameters: [
          {
            name: "hash",
            in: "path",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "networkId",
            in: "query",
            schema: { type: "string", maxLength: 128 }
          }
        ],
        responses: jsonResponse("Matching transaction observations.")
      }
    },
    "/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List project invoices",
        security: apiKeySecurity,
        parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/Offset" }],
        responses: jsonResponse("Invoice list.")
      },
      post: {
        tags: ["Invoices"],
        summary: "Create an invoice",
        description: "Only the local test simulator is currently enabled. Real networks require a verified adapter.",
        security: apiKeySecurity,
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: jsonBody({
          type: "object",
          required: ["amount", "tokenId", "networkId"],
          properties: {
            amount: { type: "string", pattern: "^(0|[1-9]\\d*)(?:\\.\\d+)?$" },
            tokenId: { type: "string", minLength: 1, maxLength: 128 },
            networkId: { type: "string", minLength: 1, maxLength: 128 },
            receivingAddress: { type: "string", maxLength: 256 },
            orderId: { type: "string", maxLength: 256 },
            expiresInSeconds: { type: "integer", minimum: 60, maximum: 604800, default: 1800 }
          }
        }),
        responses: jsonResponse("Invoice created.", {
          type: "object",
          properties: { data: { $ref: "#/components/schemas/Invoice" } }
        }, "201")
      }
    },
    "/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Retrieve an invoice",
        security: apiKeySecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" }
        }],
        responses: jsonResponse("Invoice details.")
      }
    },
    "/invoices/{id}/expire": {
      post: {
        tags: ["Invoices"],
        summary: "Expire a pending invoice",
        security: apiKeySecurity,
        parameters: [{
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" }
        }],
        responses: jsonResponse("Invoice expired or already expired.")
      }
    },
    "/test/simulate-transfer": {
      post: {
        tags: ["Test simulator"],
        summary: "Record a simulated test transfer",
        description: "Creates synthetic data with no monetary value; this endpoint is not proof of blockchain payment.",
        security: apiKeySecurity,
        parameters: [{ $ref: "#/components/parameters/IdempotencyKey" }],
        requestBody: jsonBody({
          type: "object",
          required: ["invoiceId", "amount"],
          properties: {
            invoiceId: { type: "string", minLength: 1, maxLength: 128 },
            amount: { type: "string", pattern: "^(0|[1-9]\\d*)(?:\\.\\d+)?$" }
          }
        }),
        responses: jsonResponse("Simulated transfer recorded.", {
          type: "object",
          properties: {
            data: {
              type: "object",
              required: ["transactionHash", "simulated", "invoice"],
              properties: {
                transactionHash: { type: "string", pattern: "^sim_" },
                simulated: { const: true },
                invoice: { $ref: "#/components/schemas/Invoice" }
              }
            }
          }
        }, "201")
      }
    }
  },
  components: {
    securitySchemes: {
      bearerApiKey: { type: "http", scheme: "bearer", description: "Project-scoped FluxTx API key." },
      sessionCookie: { type: "apiKey", in: "cookie", name: "fluxtx_session" }
    },
    parameters: {
      Origin: {
        name: "Origin",
        in: "header",
        required: true,
        description: "Must match the API request origin for browser mutations.",
        schema: { type: "string", format: "uri" }
      },
      IdempotencyKey: {
        name: "Idempotency-Key",
        in: "header",
        required: true,
        schema: { type: "string", minLength: 1, maxLength: 255 }
      },
      Limit: {
        name: "limit",
        in: "query",
        schema: { type: "integer", minimum: 1, maximum: 100, default: 25 }
      },
      Offset: {
        name: "offset",
        in: "query",
        schema: { type: "integer", minimum: 0, maximum: 100000, default: 0 }
      }
    },
    schemas: { Invoice: invoice },
    responses: { Error: errorResponse }
  }
} as const;

"use client";

import { Button } from "@animate-ui/react/primitives/buttons/button";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, ArrowRight, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { z } from "zod";
import { ApiError, apiJson } from "@/lib/api";

const paymentStatuses = [
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
] as const;

const sessionSchema = z.object({
  data: z.object({ user: z.object({ email: z.string() }) })
});

const projectsSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    environment: z.enum(["test", "live"])
  }))
});

const paymentsSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    projectId: z.string().uuid(),
    projectName: z.string(),
    status: z.enum(paymentStatuses),
    amountRaw: z.string().regex(/^\d+$/),
    amountDueRaw: z.string().regex(/^\d+$/),
    orderId: z.string().nullable(),
    receivingAddress: z.string(),
    expiresAt: z.string(),
    createdAt: z.string(),
    symbol: z.string(),
    decimals: z.number().int().min(0).max(36),
    networkId: z.string()
  })),
  meta: z.object({
    limit: z.number().int(),
    offset: z.number().int(),
    total: z.number().int()
  })
});

function formatUnits(raw: string, decimals: number): string {
  const amount = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = (amount / divisor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (amount % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function PaymentStatus({ status }: { status: string }) {
  const successful = status === "confirmed";
  const active = ["pending", "detected", "confirming", "underpaid"].includes(status);
  const tone = successful ? "success" : active ? "pending" : "neutral";
  return (
    <span className={`status-pill status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export default function PaymentsPage() {
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("");
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiJson("/auth/me", sessionSchema)
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiJson("/projects", projectsSchema),
    enabled: session.isSuccess
  });
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (projectId) query.set("projectId", projectId);
  if (status) query.set("status", status);
  if (search) query.set("search", search);
  const payments = useQuery({
    queryKey: ["dashboard-payments", projectId, status, search, offset],
    queryFn: () => apiJson(`/dashboard/payments?${query.toString()}`, paymentsSchema),
    enabled: session.isSuccess
  });

  if (session.isPending) {
    return <main className="loading-screen" aria-label="Loading payments" />;
  }
  if (session.isError) {
    const needsSignIn = session.error instanceof ApiError && session.error.status === 401;
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <section className="surface-card mx-auto max-w-xl p-6" role="alert">
          <h1 className="text-lg font-semibold">
            {needsSignIn ? "Sign in to view payments" : "Payments are unavailable"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{errorText(session.error)}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]" href={needsSignIn ? "/login" : "/"}>
            {needsSignIn ? "Continue to sign in" : "Back to overview"}
          </Link>
        </section>
      </main>
    );
  }

  const rows = payments.data?.data ?? [];
  const total = payments.data?.meta.total ?? 0;
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + rows.length, total);

  return (
    <main className="dashboard-background min-h-screen">
      <header className="topbar">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]" href="/">
          <ArrowLeft aria-hidden="true" size={16} />
          Overview
        </Link>
        <span className="environment-badge"><span /> Test mode</span>
      </header>

      <div className="dashboard-content">
        <section className="page-heading">
          <div>
            <p className="section-eyebrow">PAYMENT OPERATIONS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Payments</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Persisted payment records visible to your account. Amounts are shown in each payment&apos;s token.
            </p>
          </div>
          <span className="user-avatar" title={session.data.data.user.email}>
            {session.data.data.user.email.slice(0, 1).toUpperCase()}
          </span>
        </section>

        {projects.isError && (
          <p className="form-alert mb-5" role="alert">
            Project filters could not be loaded: {errorText(projects.error)}
          </p>
        )}

        <section className="surface-card mb-5 p-4 md:p-5" aria-label="Filter payments">
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setOffset(0);
              setSearch(searchText.trim());
            }}
          >
            <label className="sr-only" htmlFor="payment-search">Search payment ID or order ID</label>
            <div className="relative min-w-0 flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
              <input
                className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] pl-9 pr-3 text-sm text-[var(--foreground)]"
                id="payment-search"
                maxLength={100}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Payment ID or order ID"
                value={searchText}
              />
            </div>
            <label className="sr-only" htmlFor="payment-project">Filter by project</label>
            <select
              className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
              id="payment-project"
              onChange={(event) => {
                setProjectId(event.target.value);
                setOffset(0);
              }}
              value={projectId}
            >
              <option value="">All projects</option>
              {(projects.data?.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            <label className="sr-only" htmlFor="payment-status">Filter by status</label>
            <select
              className="min-h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)]"
              id="payment-status"
              onChange={(event) => {
                setStatus(event.target.value);
                setOffset(0);
              }}
              value={status}
            >
              <option value="">All statuses</option>
              {paymentStatuses.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
            <Button className="action-button" type="submit">Search</Button>
          </form>
        </section>

        <section className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4 md:px-6">
            <div>
              <h2 className="text-base font-semibold">Payment records</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {payments.isPending ? "Loading…" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
              </p>
            </div>
            <span className="table-count">Page size {limit}</span>
          </div>

          {payments.isError ? (
            <p className="p-5 text-sm text-[var(--danger)]" role="alert">{errorText(payments.error)}</p>
          ) : payments.isPending ? (
            <div className="space-y-4 p-5" aria-label="Loading payment records">
              <span className="skeleton-line w-full" />
              <span className="skeleton-line w-4/5" />
              <span className="skeleton-line w-3/5" />
            </div>
          ) : rows.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><Activity aria-hidden="true" size={20} /></span>
              <h3 className="mt-4 text-sm font-semibold">No matching payments</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                Payments appear here only after they have been created and persisted by the API.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="payment-table">
                  <caption className="sr-only">Payments visible to your FluxTx account</caption>
                  <thead>
                    <tr>
                      <th scope="col">Payment</th>
                      <th scope="col">Amount due</th>
                      <th scope="col">Received</th>
                      <th scope="col">Network</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <Link className="block font-medium text-[var(--accent)] hover:underline" href={`/payments/${encodeURIComponent(payment.id)}`}>
                            {payment.orderId || payment.id}
                          </Link>
                          <Link className="mt-1 block max-w-56 truncate font-mono text-xs text-[var(--muted)] hover:underline" href={`/payments/${encodeURIComponent(payment.id)}`}>
                            {payment.id}
                          </Link>
                          <span className="mt-1 block text-xs text-[var(--muted)]">{payment.projectName}</span>
                        </td>
                        <td>{formatUnits(payment.amountDueRaw, payment.decimals)} {payment.symbol}</td>
                        <td>{formatUnits(payment.amountRaw, payment.decimals)} {payment.symbol}</td>
                        <td><span className="text-xs">{payment.networkId}</span></td>
                        <td><PaymentStatus status={payment.status} /></td>
                        <td><time className="text-xs text-[var(--muted)]" dateTime={payment.createdAt}>{payment.createdAt}</time></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-4">
                <Button
                  className="secondary-button"
                  disabled={offset === 0 || payments.isFetching}
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  type="button"
                >
                  <ArrowLeft aria-hidden="true" size={14} />
                  Previous
                </Button>
                <span className="text-xs text-[var(--muted)]">
                  {total === 0 ? "No results" : `${offset + 1}–${rangeEnd} of ${total}`}
                </span>
                <Button
                  className="secondary-button"
                  disabled={offset + limit >= total || payments.isFetching}
                  onClick={() => setOffset(offset + limit)}
                  type="button"
                >
                  Next
                  <ArrowRight aria-hidden="true" size={14} />
                </Button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

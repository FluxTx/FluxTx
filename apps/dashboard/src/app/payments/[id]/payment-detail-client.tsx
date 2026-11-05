"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CircleCheck, Clock3, Layers3, ReceiptText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
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

const detailSchema = z.object({
  data: z.object({
    payment: z.object({
      id: z.string(),
      projectId: z.string().uuid(),
      status: z.enum(paymentStatuses),
      amountRaw: z.string().regex(/^\d+$/),
      amountDueRaw: z.string().regex(/^\d+$/),
      orderId: z.string().nullable(),
      receivingAddress: z.string(),
      expiresAt: z.string(),
      createdAt: z.string(),
      updatedAt: z.string(),
      symbol: z.string(),
      tokenName: z.string(),
      decimals: z.number().int().min(0).max(36),
      networkId: z.string(),
      projectName: z.string()
    }),
    events: z.array(z.object({
      id: z.string(),
      eventType: z.string(),
      previousStatus: z.string().nullable(),
      nextStatus: z.string(),
      createdAt: z.string()
    })),
    transactions: z.array(z.object({
      transactionHash: z.string(),
      blockHeight: z.number().nullable(),
      success: z.union([z.boolean(), z.number().int()]),
      confirmations: z.number().int().nonnegative(),
      finalityStatus: z.string(),
      senderAddress: z.string(),
      recipientAddress: z.string(),
      amountRaw: z.string().regex(/^\d+$/),
      observedAt: z.string(),
      matchStatus: z.enum(["matched", "ambiguous", "rejected"])
    }))
  })
});

function formatUnits(raw: string, decimals: number): string {
  const amount = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = (amount / divisor).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const fraction = (amount % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function errorText(error: unknown): string {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export function PaymentDetailClient() {
  const params = useParams<{ id: string }>();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiJson("/auth/me", sessionSchema)
  });
  const details = useQuery({
    queryKey: ["dashboard-payment", params.id],
    queryFn: () => apiJson(`/dashboard/payments/${encodeURIComponent(params.id)}`, detailSchema),
    enabled: session.isSuccess && Boolean(params.id)
  });

  if (session.isPending) {
    return <main className="loading-screen" aria-label="Loading payment details" />;
  }
  if (session.isError) {
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <section className="surface-card mx-auto max-w-xl p-6" role="alert">
          <h1 className="text-lg font-semibold">Sign in to view this payment</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{errorText(session.error)}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]" href="/login">
            Continue to sign in
          </Link>
        </section>
      </main>
    );
  }
  if (details.isPending) {
    return <main className="loading-screen" aria-label="Loading payment details" />;
  }
  if (details.isError) {
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <section className="surface-card mx-auto max-w-xl p-6" role="alert">
          <h1 className="text-lg font-semibold">Payment details are unavailable</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{errorText(details.error)}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]" href="/payments">
            Back to payments
          </Link>
        </section>
      </main>
    );
  }

  const { payment, events, transactions } = details.data.data;
  const confirmed = payment.status === "confirmed";

  return (
    <main className="dashboard-background min-h-screen">
      <header className="topbar">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]" href="/payments">
          <ArrowLeft aria-hidden="true" size={16} />
          Payments
        </Link>
        <span className="user-avatar" title={session.data.data.user.email}>
          {session.data.data.user.email.slice(0, 1).toUpperCase()}
        </span>
      </header>

      <div className="dashboard-content">
        <section className="page-heading">
          <div className="min-w-0">
            <p className="section-eyebrow">PAYMENT DETAILS</p>
            <h1 className="mt-2 break-all font-mono text-2xl font-semibold tracking-tight">{payment.id}</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {payment.projectName}{payment.orderId ? ` · Order ${payment.orderId}` : ""}
            </p>
          </div>
          <span className={`status-pill status-${confirmed ? "success" : "pending"}`}>
            <span className="status-dot" aria-hidden="true" />
            {payment.status}
          </span>
        </section>

        <section className="stats-grid" aria-label="Payment summary">
          <div className="surface-card metric-card">
            <span className="metric-label">Amount due</span>
            <strong className="metric-value">{formatUnits(payment.amountDueRaw, payment.decimals)} <span className="text-sm">{payment.symbol}</span></strong>
            <span className="metric-footnote">{payment.tokenName}</span>
          </div>
          <div className="surface-card metric-card">
            <span className="metric-label">Received</span>
            <strong className="metric-value">{formatUnits(payment.amountRaw, payment.decimals)} <span className="text-sm">{payment.symbol}</span></strong>
            <span className="metric-footnote">Recorded from matched observations</span>
          </div>
          <div className="surface-card metric-card">
            <span className="metric-label">Network</span>
            <strong className="metric-value text-lg">{payment.networkId}</strong>
            <span className="metric-footnote">Chain support is not implied by this record</span>
          </div>
        </section>

        <section className="surface-card mt-6 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="metric-icon">
              {confirmed ? <CircleCheck aria-hidden="true" size={17} /> : <Clock3 aria-hidden="true" size={17} />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold">Payment instructions</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Receiving address recorded when the payment was created.</p>
              <code className="mt-3 block break-all rounded-lg bg-[var(--surface-subtle)] p-3 text-sm">{payment.receivingAddress}</code>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Created</dt>
                  <dd className="mt-1"><time dateTime={payment.createdAt}>{payment.createdAt}</time></dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Expires</dt>
                  <dd className="mt-1"><time dateTime={payment.expiresAt}>{payment.expiresAt}</time></dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <section className="surface-card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-5">
              <div className="flex items-center gap-2">
                <ReceiptText aria-hidden="true" className="text-[var(--accent)]" size={17} />
                <h2 className="text-base font-semibold">Payment timeline</h2>
              </div>
            </div>
            {events.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted)]">No persisted status events.</p>
            ) : (
              <ol className="divide-y divide-[var(--border)]">
                {events.map((event) => (
                  <li className="flex gap-3 p-5" key={event.id}>
                    <span className="metric-icon h-8 w-8"><Layers3 aria-hidden="true" size={15} /></span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{event.eventType}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {event.previousStatus ? `${event.previousStatus} → ` : ""}{event.nextStatus}
                      </p>
                      <time className="mt-2 block text-xs text-[var(--muted)]" dateTime={event.createdAt}>{event.createdAt}</time>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="surface-card overflow-hidden">
            <div className="border-b border-[var(--border)] px-5 py-5">
              <div className="flex items-center gap-2">
                <ShieldAlert aria-hidden="true" className="text-[var(--warning)]" size={17} />
                <h2 className="text-base font-semibold">Transaction observations</h2>
              </div>
            </div>
            {transactions.length === 0 ? (
              <p className="p-5 text-sm text-[var(--muted)]">No transactions have been matched to this payment.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {transactions.map((transaction, index) => (
                  <li className="space-y-2 p-5" key={`${transaction.transactionHash}-${index}`}>
                    <code className="block break-all text-xs">{transaction.transactionHash}</code>
                    <p className="text-sm font-medium">
                      {formatUnits(transaction.amountRaw, payment.decimals)} {payment.symbol}
                      <span className="ml-2 text-xs text-[var(--muted)]">· {transaction.matchStatus}</span>
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {transaction.confirmations} confirmations · {transaction.finalityStatus}
                      {transaction.blockHeight === null ? "" : ` · block ${transaction.blockHeight}`}
                    </p>
                    <p className="break-all text-xs text-[var(--muted)]">
                      {transaction.senderAddress} → {transaction.recipientAddress}
                    </p>
                    <time className="block text-xs text-[var(--muted)]" dateTime={transaction.observedAt}>{transaction.observedAt}</time>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Transaction records reflect observations persisted by FluxTx. No current network adapter is verified for real payment processing.
        </p>
      </div>
    </main>
  );
}

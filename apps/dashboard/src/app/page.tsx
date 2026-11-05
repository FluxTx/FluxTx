"use client";

import { Button } from "@animate-ui/react/primitives/buttons/button";
import {
  Activity,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Clock3,
  FileCode2,
  FolderKanban,
  KeyRound,
  Layers3,
  ReceiptText,
  RotateCw,
  ShieldCheck
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, apiJson } from "@/lib/api";

const sessionSchema = z.object({
  data: z.object({ user: z.object({ id: z.string(), email: z.string() }) })
});

const overviewSchema = z.object({
  data: z.object({
    counts: z.object({
      totalPayments: z.number(),
      confirmedPayments: z.number(),
      pendingPayments: z.number(),
      failedPayments: z.number()
    }),
    recentPayments: z.array(z.object({
      id: z.string(),
      status: z.string(),
      amountRaw: z.string(),
      amountDueRaw: z.string(),
      orderId: z.string().nullable(),
      symbol: z.string(),
      decimals: z.number(),
      networkId: z.string(),
      projectName: z.string(),
      createdAt: z.string()
    }))
  })
});

const networkSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    name: z.string(),
    status: z.string()
  }))
});

function formatUnits(raw: string, decimals: number): string {
  const amount = BigInt(raw);
  const divisor = 10n ** BigInt(decimals);
  const whole = (amount / divisor).toString();
  const fraction = (amount % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction ? `${groupedWhole}.${fraction}` : groupedWhole;
}

function PaymentStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const successful = normalized === "confirmed";
  const inProgress = ["pending", "detected", "confirming", "underpaid"].includes(normalized);
  const tone = successful ? "success" : inProgress ? "pending" : "neutral";

  return (
    <span className={`status-pill status-${tone}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

function DashboardError({ error, retry }: { error: unknown; retry?: () => void }) {
  const message = error instanceof Error ? error.message : "The dashboard could not load.";
  const needsSignIn = error instanceof ApiError && error.status === 401;

  return (
    <section className="surface-card flex flex-col items-start gap-4 p-6" role="alert">
      <div>
        <p className="section-eyebrow">{needsSignIn ? "SESSION REQUIRED" : "CONNECTION ISSUE"}</p>
        <h2 className="mt-2 text-lg font-semibold">
          {needsSignIn ? "Sign in to view your dashboard" : "FluxTx data is unavailable"}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{message}</p>
      </div>
      {needsSignIn ? (
        <Link className="text-sm font-semibold text-[var(--accent)] hover:underline" href="/login">
          Continue to sign in
        </Link>
      ) : retry ? (
        <Button className="action-button" onClick={retry}>
          <RotateCw aria-hidden="true" size={16} />
          Retry
        </Button>
      ) : null}
    </section>
  );
}

export default function Home() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiJson("/auth/me", sessionSchema)
  });
  const overview = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: () => apiJson("/dashboard/overview", overviewSchema),
    enabled: session.isSuccess
  });
  const networks = useQuery({
    queryKey: ["networks"],
    queryFn: () => apiJson("/networks", networkSchema),
    enabled: session.isSuccess
  });

  if (session.isPending) {
    return <main className="loading-screen" aria-label="Loading FluxTx dashboard" />;
  }
  if (session.isError) {
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <DashboardError error={session.error} retry={() => void session.refetch()} />
      </main>
    );
  }

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <Link className="brand-lockup" href="/" aria-label="FluxTx home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span>
            <span className="brand-name">FluxTx</span>
            <span className="brand-caption">PAYMENTS IN MOTION</span>
          </span>
        </Link>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-avatar" aria-hidden="true">
            {session.data.data.user.email.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">My workspace</span>
            <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">Test environment</span>
          </span>
          <Layers3 aria-hidden="true" size={15} className="text-[var(--muted)]" />
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <span className="nav-section-label">PAYMENTS</span>
          <Link className="nav-link nav-link-active" href="/" aria-current="page">
            <Activity aria-hidden="true" size={17} />
            Overview
          </Link>
          <Link className="nav-link" href="/api-keys">
            <KeyRound aria-hidden="true" size={17} />
            API keys
          </Link>
          <Link className="nav-link" href="/projects">
            <FolderKanban aria-hidden="true" size={17} />
            Projects
          </Link>
          <Link className="nav-link" href="/payments">
            <ReceiptText aria-hidden="true" size={17} />
            Payments
          </Link>
          <a
            className="nav-link"
            href="/api/proxy/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
          >
            <FileCode2 aria-hidden="true" size={17} />
            API reference
            <ArrowUpRight aria-hidden="true" size={14} className="ml-auto opacity-60" />
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="security-icon"><ShieldCheck aria-hidden="true" size={17} /></div>
          <p className="text-xs font-medium">Non-custodial by design</p>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            Funds move directly to merchant-controlled wallets.
          </p>
        </div>
      </aside>

      <main className="dashboard-background min-w-0 flex-1">
        <header className="topbar">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
            <span>Workspace</span>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-[var(--foreground)]">Overview</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="environment-badge"><span /> Test mode</span>
            <span className="user-avatar" title={session.data.data.user.email}>
              {session.data.data.user.email.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="page-heading">
            <div>
              <p className="section-eyebrow">PAYMENT OPERATIONS</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">Overview</h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Live counts from your persisted FluxTx payment records.
              </p>
            </div>
            <Button
              asChild
              className="action-button"
            >
              <a href="/api/proxy/v1/openapi.json" target="_blank" rel="noreferrer">
                API reference
                <ArrowUpRight aria-hidden="true" size={16} />
              </a>
            </Button>
          </section>

          {networks.isSuccess && (
            <section className="support-notice" aria-label="Blockchain support status">
              <div className="support-notice-icon"><ShieldCheck aria-hidden="true" size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">Real-chain processing is not enabled</p>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {networks.data.data.length} networks are listed as planned. Only the local test simulator can create test payments.
                </p>
              </div>
              <span className="planned-badge">PLANNED</span>
            </section>
          )}

          {overview.isError ? (
            <DashboardError error={overview.error} retry={() => void overview.refetch()} />
          ) : overview.isPending ? (
            <div className="stats-grid" aria-label="Loading payment metrics">
              {["Total payments", "Confirmed", "In progress", "Failed"].map((label) => (
                <div className="surface-card metric-card" key={label}>
                  <span className="skeleton-line w-24" />
                  <span className="skeleton-line mt-5 h-8 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <motion.section
                className="stats-grid"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, staggerChildren: 0.06 }}
                aria-label="Payment metrics"
              >
                <MetricCard label="Total payments" value={overview.data.data.counts.totalPayments} icon={<Activity size={17} />} />
                <MetricCard label="Confirmed" value={overview.data.data.counts.confirmedPayments} icon={<CircleCheck size={17} />} />
                <MetricCard label="In progress" value={overview.data.data.counts.pendingPayments} icon={<Clock3 size={17} />} />
                <MetricCard label="Failed" value={overview.data.data.counts.failedPayments} icon={<CircleX size={17} />} />
              </motion.section>

              <section className="surface-card mt-6 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-5 md:px-6">
                  <div>
                    <h2 className="text-base font-semibold">Recent payments</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      Latest records visible to your account.
                    </p>
                  </div>
                  <span className="table-count">{overview.data.data.recentPayments.length} shown</span>
                </div>

                {overview.data.data.recentPayments.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon"><Activity aria-hidden="true" size={20} /></span>
                    <h3 className="mt-4 text-sm font-semibold">No payments yet</h3>
                    <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
                      Create a test payment through the API and use the local simulator to exercise its lifecycle. No real blockchain transfers are currently supported.
                    </p>
                    <a className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--accent)] hover:underline" href="/api/proxy/v1/openapi.json" target="_blank" rel="noreferrer">
                      Read the API reference <ArrowUpRight aria-hidden="true" size={14} />
                    </a>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="payment-table">
                      <caption className="sr-only">Recent FluxTx payments</caption>
                      <thead>
                        <tr>
                          <th scope="col">Payment</th>
                          <th scope="col">Status</th>
                          <th scope="col">Amount received</th>
                          <th scope="col">Network</th>
                          <th scope="col">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.data.data.recentPayments.map((payment) => (
                          <tr key={payment.id}>
                            <td>
                              <span className="block font-medium">{payment.orderId || payment.id}</span>
                              <span className="mt-1 block text-xs text-[var(--muted)]">{payment.projectName}</span>
                            </td>
                            <td><PaymentStatus status={payment.status} /></td>
                            <td className="font-mono text-sm">
                              {formatUnits(payment.amountRaw, payment.decimals)} {payment.symbol}
                            </td>
                            <td className="text-sm text-[var(--muted)]">{payment.networkId}</td>
                            <td className="text-sm text-[var(--muted)]">
                              <time dateTime={payment.createdAt}>
                                {new Date(payment.createdAt).toLocaleString()}
                              </time>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
                Amounts are shown in token base units converted using each token&apos;s configured decimals. No fiat conversion or cross-token volume is calculated.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <motion.article
      className="surface-card metric-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-[var(--muted)]">{label}</span>
        <span className="metric-icon" aria-hidden="true">{icon}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value.toLocaleString()}</p>
    </motion.article>
  );
}

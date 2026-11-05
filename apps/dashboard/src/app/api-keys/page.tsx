"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@animate-ui/react/primitives/buttons/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError, apiJson } from "@/lib/api";

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

const keysSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    keyPrefix: z.string(),
    environment: z.enum(["test", "live"]),
    name: z.string(),
    permissions: z.array(z.string()),
    lastUsedAt: z.string().nullable(),
    revokedAt: z.string().nullable(),
    createdAt: z.string()
  }))
});

const createKeySchema = z.object({
  projectId: z.string().uuid("Choose a project."),
  name: z.string().trim().min(1, "Enter a name for this key.").max(120),
  permissions: z.array(z.enum([
    "invoices:read",
    "invoices:write",
    "transactions:read",
    "webhooks:read",
    "webhooks:write"
  ])).min(1, "Select at least one permission.")
});

const createdKeySchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    projectId: z.string().uuid(),
    environment: z.enum(["test", "live"]),
    permissions: z.array(z.string()),
    secret: z.string()
  })
});

const permissionOptions = [
  ["invoices:read", "Read invoices"],
  ["invoices:write", "Create and manage invoices"],
  ["transactions:read", "Read transactions"],
  ["webhooks:read", "Read webhooks"],
  ["webhooks:write", "Manage webhooks"]
] as const;

const revokeResponseSchema = z.null();

function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [createdSecret, setCreatedSecret] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const form = useForm<z.infer<typeof createKeySchema>>({
    resolver: zodResolver(createKeySchema),
    defaultValues: { projectId: "", name: "", permissions: ["invoices:read"] }
  });

  const session = useQuery({
    queryKey: ["session"],
    queryFn: () => apiJson("/auth/me", sessionSchema)
  });
  const projects = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiJson("/projects", projectsSchema),
    enabled: session.isSuccess
  });
  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => apiJson("/api-keys", keysSchema),
    enabled: session.isSuccess
  });
  const availableProjects = projects.data?.data ?? [];
  const firstProjectId = availableProjects[0]?.id;
  useEffect(() => {
    if (!form.getValues("projectId") && firstProjectId) {
      form.setValue("projectId", firstProjectId);
    }
  }, [firstProjectId, form]);

  const createKey = useMutation({
    mutationFn: (values: z.infer<typeof createKeySchema>) =>
      apiJson("/api-keys", createdKeySchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: (result) => {
      setCreatedSecret(result.data.secret);
      setErrorMessage(undefined);
      setNotice("Copy this secret now. FluxTx will not show it again.");
      form.reset({
        projectId: result.data.projectId,
        name: "",
        permissions: ["invoices:read"]
      });
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => setErrorMessage(messageFrom(error))
  });

  const revokeKey = useMutation({
    mutationFn: (id: string) =>
      apiJson(`/api-keys/${encodeURIComponent(id)}`, revokeResponseSchema, { method: "DELETE" }),
    onSuccess: () => {
      setNotice("API key revoked.");
      setErrorMessage(undefined);
      void queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (error) => setErrorMessage(messageFrom(error))
  });

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret);
      setNotice("API key copied. Store it in a secure secret manager.");
    } catch {
      setErrorMessage("Clipboard access was denied. Select and copy the key manually.");
    }
  };

  if (session.isPending) {
    return <main className="loading-screen" aria-label="Loading API keys" />;
  }
  if (session.isError) {
    const needsSignIn = session.error instanceof ApiError && session.error.status === 401;
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <section className="surface-card mx-auto max-w-xl p-6" role="alert">
          <h1 className="text-lg font-semibold">
            {needsSignIn ? "Sign in to manage API keys" : "API keys are unavailable"}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">{messageFrom(session.error)}</p>
          <Link className="mt-4 inline-flex text-sm font-semibold text-[var(--accent)]" href={needsSignIn ? "/login" : "/"}>
            {needsSignIn ? "Continue to sign in" : "Back to overview"}
          </Link>
        </section>
      </main>
    );
  }

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
            <p className="section-eyebrow">DEVELOPER SETTINGS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">API keys</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Create project-scoped credentials and revoke them when they are no longer needed.
            </p>
          </div>
          <span className="user-avatar" title={session.data.data.user.email}>
            {session.data.data.user.email.slice(0, 1).toUpperCase()}
          </span>
        </section>

        <section className="support-notice" aria-label="API key handling guidance">
          <div className="support-notice-icon"><ShieldCheck aria-hidden="true" size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Secrets are shown once</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Store new keys securely. Only a non-secret prefix is retained for later identification.
            </p>
          </div>
        </section>

        {projects.isError && <p className="form-alert mt-5" role="alert">{messageFrom(projects.error)}</p>}
        {errorMessage && <p className="form-alert mt-5" role="alert">{errorMessage}</p>}
        {notice && <p className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm" role="status">{notice}</p>}

        {createdSecret && (
          <section className="surface-card mt-5 p-5" aria-labelledby="new-key-heading">
            <h2 id="new-key-heading" className="text-sm font-semibold">New API key — copy it now</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="min-w-0 flex-1 break-all rounded-lg bg-[var(--surface-subtle)] p-3 text-sm">{createdSecret}</code>
              <Button className="action-button" onClick={() => void copySecret()} type="button">
                <Copy aria-hidden="true" size={15} />
                Copy
              </Button>
              <Button
                className="secondary-button"
                onClick={() => {
                  setCreatedSecret(undefined);
                  createKey.reset();
                }}
                type="button"
              >
                Dismiss
              </Button>
            </div>
          </section>
        )}

        <section className="surface-card mt-6 p-5 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="metric-icon"><KeyRound aria-hidden="true" size={17} /></span>
            <div>
              <h2 className="text-base font-semibold">Create an API key</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Grant only the permissions your integration needs.</p>
            </div>
          </div>

          {projects.isPending ? (
            <p className="text-sm text-[var(--muted)]">Loading projects…</p>
          ) : availableProjects.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Create a project before issuing an API key.</p>
          ) : (
            <form
              className="auth-form"
              onSubmit={form.handleSubmit((values) => {
                setErrorMessage(undefined);
                setNotice(undefined);
                createKey.mutate(values);
              })}
            >
              <label className="form-field">
                <span>Project</span>
                <select {...form.register("projectId")}>
                  {availableProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} · {project.environment}
                    </option>
                  ))}
                </select>
                {form.formState.errors.projectId?.message && (
                  <span className="field-error">{form.formState.errors.projectId.message}</span>
                )}
              </label>

              <label className="form-field">
                <span>Key name</span>
                <input autoComplete="off" maxLength={120} {...form.register("name")} />
                {form.formState.errors.name?.message && (
                  <span className="field-error">{form.formState.errors.name.message}</span>
                )}
              </label>

              <fieldset className="rounded-lg border border-[var(--border)] p-4">
                <legend className="px-1 text-sm font-medium">Permissions</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {permissionOptions.map(([permission, label]) => (
                    <label className="flex items-start gap-2 text-sm" key={permission}>
                      <input
                        className="mt-0.5 accent-[var(--accent)]"
                        type="checkbox"
                        value={permission}
                        {...form.register("permissions")}
                      />
                      <span>
                        {label}
                        <span className="mt-0.5 block text-xs text-[var(--muted)]">{permission}</span>
                      </span>
                    </label>
                  ))}
                </div>
                {form.formState.errors.permissions?.message && (
                  <p className="field-error mt-3">{form.formState.errors.permissions.message}</p>
                )}
              </fieldset>

              <Button className="action-button w-fit" disabled={createKey.isPending} type="submit">
                <KeyRound aria-hidden="true" size={15} />
                {createKey.isPending ? "Creating…" : "Create API key"}
              </Button>
            </form>
          )}
        </section>

        <section className="surface-card mt-6 overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-5 md:px-6">
            <h2 className="text-base font-semibold">Existing keys</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Revoked keys cannot be used to authenticate requests.</p>
          </div>
          {keys.isPending ? (
            <p className="p-5 text-sm text-[var(--muted)]">Loading API keys…</p>
          ) : keys.isError ? (
            <p className="p-5 text-sm text-[var(--danger)]" role="alert">{messageFrom(keys.error)}</p>
          ) : keys.data.data.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">No API keys have been created.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {keys.data.data.map((key) => (
                <li className="flex flex-wrap items-center justify-between gap-4 p-5" key={key.id}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{key.name}</span>
                      <code className="text-xs text-[var(--muted)]">{key.keyPrefix}…</code>
                      <span className={`environment-badge ${key.revokedAt ? "opacity-60" : ""}`}>
                        {key.revokedAt ? "Revoked" : key.environment}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {key.permissions.join(", ")} · {key.lastUsedAt ? `Last used ${key.lastUsedAt}` : "Not used yet"}
                    </p>
                  </div>
                  {!key.revokedAt && (
                    <Button
                      className="secondary-button"
                      disabled={revokeKey.isPending}
                      onClick={() => {
                        if (window.confirm(`Revoke the API key “${key.name}”? Existing integrations using it will stop working.`)) {
                          setErrorMessage(undefined);
                          revokeKey.mutate(key.id);
                        }
                      }}
                      type="button"
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

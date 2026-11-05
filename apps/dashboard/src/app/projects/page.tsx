"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@animate-ui/react/primitives/buttons/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FolderKanban, Pencil, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
    environment: z.enum(["test", "live"]),
    createdAt: z.string()
  }))
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Enter a project name.").max(120),
  environment: z.enum(["test", "live"])
});

const projectResponseSchema = z.object({
  data: z.object({
    id: z.string().uuid(),
    name: z.string(),
    environment: z.enum(["test", "live"])
  })
});

function messageFrom(error: unknown): string {
  return error instanceof ApiError ? error.message : "The request could not be completed.";
}

function ProjectRow({ project }: { project: z.infer<typeof projectsSchema>["data"][number] }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(project.name);
  const [message, setMessage] = useState<string>();
  const updateProject = useMutation({
    mutationFn: (updatedName: string) =>
      apiJson(`/projects/${encodeURIComponent(project.id)}`, projectResponseSchema, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: updatedName })
      }),
    onSuccess: () => {
      setMessage("Project name updated.");
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => setMessage(messageFrom(error))
  });

  return (
    <li className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="metric-icon mt-0.5"><FolderKanban aria-hidden="true" size={17} /></span>
        <div className="min-w-0">
          <label className="sr-only" htmlFor={`project-name-${project.id}`}>Project name</label>
          <input
            className="min-h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm font-semibold text-[var(--foreground)] md:w-72"
            id={`project-name-${project.id}`}
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
          <p className="mt-2 text-xs text-[var(--muted)]">
            Created <time dateTime={project.createdAt}>{project.createdAt}</time>
          </p>
          {message && <p className="mt-2 text-xs text-[var(--muted)]" role="status">{message}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`environment-badge ${project.environment === "live" ? "border-[var(--warning)]" : ""}`}>
          {project.environment === "live" ? "Live environment" : "Test environment"}
        </span>
        <Button
          className="secondary-button"
          disabled={updateProject.isPending || !name.trim() || name.trim() === project.name}
          onClick={() => {
            setMessage(undefined);
            updateProject.mutate(name.trim());
          }}
          type="button"
        >
          <Pencil aria-hidden="true" size={14} />
          {updateProject.isPending ? "Saving…" : "Save name"}
        </Button>
      </div>
    </li>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: "", environment: "test" }
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
  const createProject = useMutation({
    mutationFn: (values: z.infer<typeof createProjectSchema>) =>
      apiJson("/projects", projectResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: (result) => {
      form.reset({ name: "", environment: "test" });
      setErrorMessage(undefined);
      setNotice(`Project “${result.data.name}” created.`);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: (error) => setErrorMessage(messageFrom(error))
  });

  if (session.isPending) {
    return <main className="loading-screen" aria-label="Loading projects" />;
  }
  if (session.isError) {
    const needsSignIn = session.error instanceof ApiError && session.error.status === 401;
    return (
      <main className="dashboard-background min-h-screen p-5 md:p-10">
        <section className="surface-card mx-auto max-w-xl p-6" role="alert">
          <h1 className="text-lg font-semibold">
            {needsSignIn ? "Sign in to manage projects" : "Projects are unavailable"}
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
            <p className="section-eyebrow">WORKSPACE SETTINGS</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Organize API credentials and payment activity by environment.
            </p>
          </div>
          <span className="user-avatar" title={session.data.data.user.email}>
            {session.data.data.user.email.slice(0, 1).toUpperCase()}
          </span>
        </section>

        <section className="support-notice" aria-label="Environment limitations">
          <div className="support-notice-icon"><ShieldCheck aria-hidden="true" size={18} /></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Live blockchain payments are not enabled</p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Live projects can be configured, but no network is verified or enabled for real transfers.
            </p>
          </div>
          <span className="planned-badge">PLANNED</span>
        </section>

        {errorMessage && <p className="form-alert mt-5" role="alert">{errorMessage}</p>}
        {notice && <p className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm" role="status">{notice}</p>}

        <section className="surface-card mt-6 p-5 md:p-6">
          <h2 className="text-base font-semibold">Create a project</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Projects are isolated by organization and environment.</p>
          <form
            className="auth-form mt-5"
            onSubmit={form.handleSubmit((values) => {
              setErrorMessage(undefined);
              setNotice(undefined);
              createProject.mutate(values);
            })}
          >
            <label className="form-field">
              <span>Project name</span>
              <input autoComplete="off" maxLength={120} {...form.register("name")} />
              {form.formState.errors.name?.message && (
                <span className="field-error">{form.formState.errors.name.message}</span>
              )}
            </label>
            <label className="form-field">
              <span>Environment</span>
              <select {...form.register("environment")}>
                <option value="test">Test</option>
                <option value="live">Live</option>
              </select>
            </label>
            <Button className="action-button w-fit" disabled={createProject.isPending} type="submit">
              {createProject.isPending ? "Creating…" : "Create project"}
            </Button>
          </form>
        </section>

        <section className="surface-card mt-6 overflow-hidden">
          <div className="border-b border-[var(--border)] px-5 py-5 md:px-6">
            <h2 className="text-base font-semibold">Your projects</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Renaming requires organization owner or admin access.</p>
          </div>
          {projects.isPending ? (
            <p className="p-5 text-sm text-[var(--muted)]">Loading projects…</p>
          ) : projects.isError ? (
            <p className="p-5 text-sm text-[var(--danger)]" role="alert">{messageFrom(projects.error)}</p>
          ) : projects.data.data.length === 0 ? (
            <p className="p-5 text-sm text-[var(--muted)]">No projects yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {projects.data.data.map((project) => <ProjectRow key={project.id} project={project} />)}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

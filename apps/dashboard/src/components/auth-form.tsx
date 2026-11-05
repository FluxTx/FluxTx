"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@animate-ui/react/primitives/buttons/button";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError, apiJson } from "@/lib/api";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password.")
});

const registrationSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  organizationName: z.string().trim().min(1, "Enter an organization name.").max(120),
  password: z.string().min(12, "Use at least 12 characters.").max(128)
});

const loginResponseSchema = z.object({
  data: z.object({ user: z.object({ id: z.string(), email: z.string() }) })
});

const registrationResponseSchema = z.object({
  data: z.object({
    user: z.object({ id: z.string(), email: z.string() }),
    organization: z.object({ id: z.string(), name: z.string() }),
    project: z.object({ id: z.string(), name: z.string(), environment: z.string() })
  })
});

function FieldError({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof loginSchema>) =>
      apiJson("/auth/login", loginResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : "Sign-in failed. Try again.");
    }
  });

  return (
    <AuthPanel
      title="Welcome back"
      description="Sign in to manage your FluxTx test workspace."
      footer={<>New to FluxTx? <Link href="/register">Create an account</Link></>}
    >
      <form className="auth-form" onSubmit={form.handleSubmit((values) => {
        setServerError(undefined);
        mutation.mutate(values);
      })}>
        <label className="form-field">
          <span>Email address</span>
          <input autoComplete="email" type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input autoComplete="current-password" type="password" {...form.register("password")} />
          <FieldError message={form.formState.errors.password?.message} />
        </label>
        {serverError && <p className="form-alert" role="alert">{serverError}</p>}
        <Button className="auth-submit" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthPanel>
  );
}

export function RegistrationForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string>();
  const form = useForm<z.infer<typeof registrationSchema>>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { email: "", organizationName: "", password: "" }
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof registrationSchema>) =>
      apiJson("/auth/register", registrationResponseSchema, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values)
      }),
    onSuccess: () => {
      router.replace("/");
      router.refresh();
    },
    onError: (error) => {
      setServerError(error instanceof ApiError ? error.message : "Account creation failed. Try again.");
    }
  });

  return (
    <AuthPanel
      title="Create your workspace"
      description="Start in test mode. No real blockchain network is enabled yet."
      footer={<>Already have an account? <Link href="/login">Sign in</Link></>}
    >
      <form className="auth-form" onSubmit={form.handleSubmit((values) => {
        setServerError(undefined);
        mutation.mutate(values);
      })}>
        <label className="form-field">
          <span>Organization name</span>
          <input autoComplete="organization" {...form.register("organizationName")} />
          <FieldError message={form.formState.errors.organizationName?.message} />
        </label>
        <label className="form-field">
          <span>Email address</span>
          <input autoComplete="email" type="email" {...form.register("email")} />
          <FieldError message={form.formState.errors.email?.message} />
        </label>
        <label className="form-field">
          <span>Password</span>
          <input autoComplete="new-password" type="password" {...form.register("password")} />
          <span className="field-hint">At least 12 characters.</span>
          <FieldError message={form.formState.errors.password?.message} />
        </label>
        {serverError && <p className="form-alert" role="alert">{serverError}</p>}
        <Button className="auth-submit" disabled={mutation.isPending} type="submit">
          {mutation.isPending ? "Creating workspace…" : "Create account"}
        </Button>
      </form>
    </AuthPanel>
  );
}

function AuthPanel({
  title,
  description,
  footer,
  children
}: {
  title: string;
  description: string;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <div className="auth-top">
        <Link className="brand-lockup" href="/" aria-label="FluxTx home">
          <span className="brand-mark" aria-hidden="true">F</span>
          <span><span className="brand-name">FluxTx</span><span className="brand-caption">PAYMENTS IN MOTION</span></span>
        </Link>
        <span className="environment-badge"><span /> Test mode</span>
      </div>
      <section className="auth-card">
        <p className="section-eyebrow">MERCHANT DASHBOARD</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        <div className="mt-7">{children}</div>
        <p className="auth-footer">{footer}</p>
      </section>
      <p className="auth-disclaimer">
        FluxTx monitors payment activity. It does not custody or control funds.
      </p>
    </main>
  );
}

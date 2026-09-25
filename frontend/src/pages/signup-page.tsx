import {
  ArrowLeft,
  LifeBuoy,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  AuthShell,
} from "@/features/auth/auth-shell";


/*
 * Public self-service registration is intentionally disabled in production.
 *
 * Keep /signup available for old links and bookmarks, but do not present a
 * registration form that the production backend is intentionally configured
 * to reject.
 */
export function SignupPage() {
  return (
    <AuthShell
      description="Public self-service registration is currently closed. Contact CloudOps Insight to request product access."
      eyebrow="Access by request"
      title="Request CloudOps Insight access"
    >
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.045] p-5">
        <div className="flex size-11 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
          <LockKeyhole className="size-5" />
        </div>

        <p className="mt-4 text-sm font-semibold">
          Public registration is currently closed
        </p>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          New workspaces are currently created through controlled access.
          Existing CloudOps Insight users can continue to sign in normally.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <Link
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          to="/contact"
        >
          <LifeBuoy className="size-4" />

          Request access
        </Link>

        <a
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border/60 px-4 text-sm font-medium transition-colors hover:bg-accent"
          href="mailto:support@cloudopsinsight.tech"
        >
          <Mail className="size-4" />

          support@cloudopsinsight.tech
        </a>
      </div>

      <div className="mt-7 border-t border-border/50 pt-6">
        <Link
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          to="/login"
        >
          <ArrowLeft className="size-3.5" />

          Already have an account? Sign in
        </Link>
      </div>
    </AuthShell>
  );
}

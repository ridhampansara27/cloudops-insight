import {
  ArrowRight,
  CloudCog,
  Eye,
  Layers3,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";


export function AboutPage() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <main className="cloudops-backdrop relative min-h-screen overflow-hidden">
        <div
          aria-hidden="true"
          className="cloudops-grid-mask pointer-events-none absolute inset-0"
        />

        <header className="relative border-b border-border/50">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link
              className="flex items-center gap-3"
              to="/"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
                <CloudCog className="size-5" />
              </span>

              <span className="font-semibold">
                CloudOps Insight
              </span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
                to="/contact"
              >
                Contact
              </Link>

              <Link
                className="rounded-xl border border-border/60 bg-card/50 px-4 py-2 text-sm"
                to="/login"
              >
                Sign in
              </Link>
            </div>
          </div>
        </header>

        <section className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
            About CloudOps Insight
          </p>

          <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Making cloud operations easier to understand.
          </h1>

          <p className="mt-7 max-w-3xl text-base leading-8 text-muted-foreground">
            CloudOps Insight is being built to reduce the fragmentation between
            cloud inventory, monitoring and cost analysis. Instead of forcing
            engineers to jump between separate operational views, the platform
            brings important AWS information into a unified workspace.
          </p>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            <article className="cloudops-interactive rounded-2xl border border-border/60 bg-card/50 p-6">
              <Eye className="size-5 text-cyan-300" />

              <h2 className="mt-5 font-semibold">
                Visibility
              </h2>

              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Understand resources, cloud state, costs and monitoring data
                from one operational workspace.
              </p>
            </article>

            <article className="cloudops-interactive rounded-2xl border border-border/60 bg-card/50 p-6">
              <Layers3 className="size-5 text-violet-300" />

              <h2 className="mt-5 font-semibold">
                Context
              </h2>

              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Keep infrastructure, incidents and FinOps information connected
                instead of treating them as unrelated systems.
              </p>
            </article>

            <article className="cloudops-interactive rounded-2xl border border-border/60 bg-card/50 p-6">
              <ShieldCheck className="size-5 text-emerald-300" />

              <h2 className="mt-5 font-semibold">
                Customer control
              </h2>

              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Use read-oriented AWS integration patterns and explicit
                disconnect, removal and account-lifecycle controls.
              </p>
            </article>
          </div>

          <div className="mt-16 rounded-3xl border border-border/60 bg-card/50 p-7 sm:p-9">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Current stage
            </p>

            <h2 className="mt-4 text-2xl font-semibold">
              An evolving student-built cloud platform.
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">
              CloudOps Insight is currently operated by Ridham Pansara as an
              individual student project in Germany. The platform is being
              developed toward commercial availability while security,
              recovery, tenant isolation and customer lifecycle controls are
              tested and hardened.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
                to="/signup"
              >
                Create account
                <ArrowRight className="size-4" />
              </Link>

              <Link
                className="rounded-xl border border-border/60 px-5 py-3 text-sm font-medium"
                to="/contact"
              >
                Contact
              </Link>
            </div>
          </div>
        </section>

        <footer className="relative border-t border-border/50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-7 text-xs text-muted-foreground sm:px-6 lg:px-8">
            <p>
              © 2026 CloudOps Insight
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/privacy">
                Privacy
              </Link>

              <Link to="/terms">
                Terms
              </Link>

              <Link to="/impressum">
                Impressum
              </Link>

              <Link to="/">
                Home
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
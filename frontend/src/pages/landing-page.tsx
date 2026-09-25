import {
  useEffect,
  useState,
} from "react";

import {
  ArrowRight,
  CheckCircle2,
  CloudCog,
  Menu,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  CommandCenterPreview,
} from "@/components/landing/command-center-preview";

import {
  FeatureBento,
} from "@/components/landing/feature-bento";

import {
  LandingFaq,
} from "@/components/landing/landing-faq";

import {
  ProductPreview,
} from "@/components/landing/product-preview";

import {
  SecurityArchitecture,
} from "@/components/landing/security-architecture";

import {
  getCurrentUser,
  logoutSession,
} from "@/features/auth/api/auth-api";

import {
  refreshAuthenticationSession,
} from "@/lib/api-client";

import {
  useAuthStore,
} from "@/stores/auth-store";


const capabilityStrip = [
  "AWS inventory visibility",
  "CloudWatch-linked monitoring",
  "Cost Explorer context",
  "Resource health evaluation",
  "Incidents & recommendations",
] as const;

const problemCards = [
  {
    title: "Too many disconnected consoles",
    description:
      "Infrastructure, monitoring and billing often live in separate views, slowing down operational understanding.",
  },
  {
    title: "Costs without infrastructure context",
    description:
      "Teams can see spend numbers, but not always the operational resources and services responsible for them.",
  },
  {
    title: "Monitoring without decision context",
    description:
      "Metrics are more useful when they remain connected to resources, incidents, health state and ownership context.",
  },
] as const;

const builtForCards = [
  {
    title: "DevOps & Platform Teams",
    description:
      "Understand infrastructure state and operational health without switching between disconnected views.",
  },
  {
    title: "FinOps & Engineering",
    description:
      "Put AWS service costs beside the infrastructure and teams responsible for them.",
  },
  {
    title: "Startups & Cloud Teams",
    description:
      "Build operational visibility without assembling another collection of disconnected internal dashboards.",
  },
] as const;


export function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  const sessionStatus =
    useAuthStore((state) => state.sessionStatus);

  const setAccessToken =
    useAuthStore((state) => state.setAccessToken);

  const setUser =
    useAuthStore((state) => state.setUser);

  const setSessionStatus =
    useAuthStore((state) => state.setSessionStatus);

  const logout =
    useAuthStore((state) => state.logout);

  useEffect(() => {
    if (sessionStatus !== "checking") {
      return;
    }

    let active = true;

    void (async () => {
      const accessToken =
        await refreshAuthenticationSession();

      if (!active) {
        return;
      }

      if (!accessToken) {
        logout();
        return;
      }

      try {
        const currentUser = await getCurrentUser();

        if (!active) {
          return;
        }

        setAccessToken(accessToken);
        setUser(currentUser);
        setSessionStatus("authenticated");
      } catch {
        if (active) {
          logout();
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [
    logout,
    sessionStatus,
    setAccessToken,
    setSessionStatus,
    setUser,
  ]);

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      await logoutSession();
      logout();
      setMobileMenuOpen(false);
    } finally {
      setSigningOut(false);
    }
  }

  const isAuthenticated =
    sessionStatus === "authenticated";

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="cloudops-backdrop relative min-h-screen overflow-hidden">
        <div
          aria-hidden="true"
          className="cloudops-grid-mask pointer-events-none absolute inset-0"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_48%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.10),transparent_28%)]"
        />

        <header className="landing-header sticky top-0 z-50 border-b border-cyan-400/[0.08] backdrop-blur-2xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
            <Link
              className="flex items-center gap-3"
              to="/"
            >
              <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
                <CloudCog className="size-5" />
              </span>

              <span className="font-semibold tracking-tight">
                CloudOps Insight
              </span>
            </Link>

            <nav
              aria-label="Primary"
              className="hidden items-center gap-7 text-sm text-muted-foreground lg:flex"
            >
              <a className="transition-colors hover:text-foreground" href="#why-cloudops">
                Why CloudOps
              </a>

              <a className="transition-colors hover:text-foreground" href="#features">
                Features
              </a>

              <a className="transition-colors hover:text-foreground" href="#how-it-works">
                How it works
              </a>

              <a className="transition-colors hover:text-foreground" href="#security">
                Security
              </a>

              <Link className="transition-colors hover:text-foreground" to="/about">
                About
              </Link>

              <Link className="transition-colors hover:text-foreground" to="/contact">
                Contact
              </Link>
            </nav>

            <div className="hidden items-center gap-3 lg:flex">
              {sessionStatus === "checking" ? (
                <span className="text-sm text-muted-foreground">
                  Checking session...
                </span>
              ) : isAuthenticated ? (
                <>
                  <Link
                    className="rounded-xl border border-border/70 bg-card/70 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/30 hover:bg-card"
                    to="/dashboard"
                  >
                    Open dashboard
                  </Link>

                  <button
                    className="rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:bg-white/[0.05] hover:text-foreground disabled:opacity-50"
                    disabled={signingOut}
                    onClick={handleSignOut}
                    type="button"
                  >
                    {signingOut ? "Signing out..." : "Sign out"}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    className="rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                    to="/login"
                  >
                    Sign in
                  </Link>

                  <Link
                    className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/10 transition hover:bg-cyan-300"
                    to="/signup"
                  >
                    Get started free
                  </Link>
                </>
              )}
            </div>

            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation"
              className="flex size-10 items-center justify-center rounded-xl border border-border/60 bg-card/60 lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}
            </button>
          </div>

          {mobileMenuOpen && (
            <div className="landing-mobile-menu border-t border-cyan-400/[0.08] px-4 py-5 backdrop-blur-2xl lg:hidden">
              <nav className="mx-auto flex max-w-7xl flex-col gap-1 text-sm">
                <a className="landing-mobile-link" href="#why-cloudops" onClick={() => setMobileMenuOpen(false)}>
                  Why CloudOps
                </a>

                <a className="landing-mobile-link" href="#features" onClick={() => setMobileMenuOpen(false)}>
                  Features
                </a>

                <a className="landing-mobile-link" href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                  How it works
                </a>

                <a className="landing-mobile-link" href="#security" onClick={() => setMobileMenuOpen(false)}>
                  Security
                </a>

                <Link to="/about">
                  About
                </Link>

                <Link to="/contact">
                  Contact
                </Link>

                <div className="mt-2 flex flex-wrap gap-3 border-t border-border/50 pt-4">
                  {isAuthenticated ? (
                    <>
                      <Link
                        className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
                        to="/dashboard"
                      >
                        Open dashboard
                      </Link>

                      <button
                        className="rounded-xl border border-border/60 px-4 py-2"
                        onClick={handleSignOut}
                        type="button"
                      >
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        className="rounded-xl border border-border/60 px-4 py-2"
                        to="/login"
                      >
                        Sign in
                      </Link>

                      <Link
                        className="rounded-xl bg-cyan-400 px-4 py-2 font-semibold text-slate-950"
                        to="/signup"
                      >
                        Get started free
                      </Link>
                    </>
                  )}
                </div>
              </nav>
            </div>
          )}
        </header>

        <main className="relative">
          <section className="mx-auto max-w-[1480px] px-4 pb-14 pt-14 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="grid items-center gap-12 xl:grid-cols-[0.94fr_1.06fr]">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-1.5 text-xs font-medium text-cyan-200">
                  <Sparkles className="size-3.5" />
                  AWS operations + monitoring + FinOps
                </div>

                <h1 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-5xl xl:text-[3.55rem]">
                  A modern
                  {" "}
                  <span className="text-cyan-300">
                    cloud command center
                  </span>
                  {" "}
                  for understanding AWS infrastructure, spend and health.
                </h1>

                <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-[1.05rem]">
                  CloudOps Insight helps teams connect AWS inventory,
                  CloudWatch-linked monitoring, cost visibility, resource
                  health, incidents and recommendations in one operational
                  workspace.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 shadow-xl shadow-cyan-500/10 transition hover:bg-cyan-300"
                    to={isAuthenticated ? "/dashboard" : "/signup"}
                  >
                    {isAuthenticated ? "Open dashboard" : "Get started free"}
                    <ArrowRight className="size-4" />
                  </Link>

                  <a
                    className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/60 px-5 py-3 text-sm font-medium transition hover:border-cyan-400/30 hover:bg-card"
                    href="#features"
                  >
                    Explore features
                  </a>
                </div>

                <div className="mt-10 flex flex-wrap gap-3 text-sm">
                  <div className="rounded-xl border border-border/50 bg-card/35 px-4 py-3 text-muted-foreground">
                    Read-only AWS access
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/35 px-4 py-3 text-muted-foreground">
                    ExternalId-protected access
                  </div>

                  <div className="rounded-xl border border-border/50 bg-card/35 px-4 py-3 text-muted-foreground">
                    Tenant-isolated workspaces
                  </div>
                </div>
              </div>

              <CommandCenterPreview />
            </div>

            <div className="mx-auto mt-8 grid w-full max-w-[340px] gap-3 rounded-3xl border border-border/50 bg-card/[0.22] p-3 sm:max-w-none sm:grid-cols-2 sm:p-4 lg:grid-cols-5">
              {capabilityStrip.map((item) => (
                <div
                  className="rounded-2xl border border-border/40 bg-background/20 px-4 py-3 text-sm text-muted-foreground"
                  key={item}
                >
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section
            className="border-y border-border/50 bg-card/[0.16]"
            id="why-cloudops"
          >
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Why CloudOps Insight
              </p>

              <h2 className="mt-4 max-w-4xl text-3xl font-semibold tracking-tight sm:text-4xl">
                The problem is not a lack of data. It is a lack of connected operational context.
              </h2>

              <div className="mx-auto mt-10 grid w-full max-w-[340px] gap-4 sm:max-w-none md:grid-cols-3">
                {problemCards.map((card) => (
                  <article
                    className="rounded-3xl border border-border/60 bg-card/50 p-6"
                    key={card.title}
                  >
                    <h3 className="text-lg font-semibold">
                      {card.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {card.description}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section
            className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16"
            id="features"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Product capabilities
            </p>

            <h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              Built to make infrastructure, monitoring and FinOps easier to understand.
            </h2>

            <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground">
              The platform is designed to reduce context switching by bringing
              operationally important AWS information into a unified workspace.
            </p>

            <div className="mt-10">
              <FeatureBento />
            </div>
          </section>

          <section className="border-y border-border/50 bg-card/[0.16]">
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
              <ProductPreview />
            </div>
          </section>

          <section
            className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16"
            id="how-it-works"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              How it works
            </p>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              From AWS account to operational visibility.
            </h2>

            <div className="mx-auto mt-10 grid w-full max-w-[340px] gap-4 sm:max-w-none md:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-3xl border border-border/60 bg-card/50 p-6">
                <p className="text-sm font-semibold text-cyan-300">
                  01
                </p>
                <h3 className="mt-6 text-lg font-semibold">
                  Create a workspace
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Start with an isolated CloudOps Insight workspace for your
                  organization.
                </p>
              </article>

              <article className="rounded-3xl border border-border/60 bg-card/50 p-6">
                <p className="text-sm font-semibold text-cyan-300">
                  02
                </p>
                <h3 className="mt-6 text-lg font-semibold">
                  Connect AWS securely
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Configure the cross-account IAM role and CloudOps-generated
                  ExternalId.
                </p>
              </article>

              <article className="rounded-3xl border border-border/60 bg-card/50 p-6">
                <p className="text-sm font-semibold text-cyan-300">
                  03
                </p>
                <h3 className="mt-6 text-lg font-semibold">
                  Synchronize AWS data
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Import supported inventory, cost context and monitoring data
                  into the workspace.
                </p>
              </article>

              <article className="rounded-3xl border border-border/60 bg-card/50 p-6">
                <p className="text-sm font-semibold text-cyan-300">
                  04
                </p>
                <h3 className="mt-6 text-lg font-semibold">
                  Understand operations
                </h3>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  Explore health, costs, incidents and recommendations from one
                  operational command center.
                </p>
              </article>
            </div>
          </section>

          <section
            className="border-y border-border/50 bg-card/[0.16]"
            id="security"
          >
            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
              <SecurityArchitecture />
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto grid w-full max-w-[340px] gap-4 sm:max-w-none md:grid-cols-3">
              {builtForCards.map((card) => (
                <article
                  className="rounded-3xl border border-border/60 bg-card/50 p-6"
                  key={card.title}
                >
                  <h3 className="text-xl font-semibold">
                    {card.title}
                  </h3>

                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {card.description}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="border-y border-border/50 bg-card/[0.16]">
            <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                  FAQ
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Questions customers usually ask first.
                </h2>

                <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
                  These answers help explain the current product model,
                  integration pattern and operational intent.
                </p>
              </div>

              <div className="mt-10">
                <LandingFaq />
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8 lg:py-20">
            <div className="cloudops-glass rounded-[32px] border border-cyan-400/15 px-6 py-14 shadow-2xl shadow-cyan-950/20 sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Start exploring
              </p>

              <h2 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Get visibility into your AWS environment.
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
                Create a workspace, connect AWS securely and bring inventory,
                monitoring and FinOps information into one operational command
                center.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950"
                  to={isAuthenticated ? "/dashboard" : "/signup"}
                >
                  {isAuthenticated ? "Open dashboard" : "Create account"}
                  <ArrowRight className="size-4" />
                </Link>

                {!isAuthenticated && (
                  <Link
                    className="rounded-xl border border-border/60 px-5 py-3 text-sm font-medium"
                    to="/login"
                  >
                    Sign in
                  </Link>
                )}
              </div>

              <div className="mt-10 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/25 px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-emerald-300" />
                  Public signup supported
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/25 px-3 py-2">
                  <CheckCircle2 className="size-3.5 text-emerald-300" />
                  Secure AWS onboarding
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/25 px-3 py-2">
                  <ShieldCheck className="size-3.5 text-cyan-300" />
                  Commercial readiness in progress
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer className="relative border-t border-border/50 bg-background/70">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
                  <CloudCog className="size-5" />
                </span>

                <span className="font-semibold">
                  CloudOps Insight
                </span>
              </div>

              <p className="mt-4 max-w-sm text-sm leading-7 text-muted-foreground">
                A cloud command center for AWS visibility across inventory,
                monitoring, costs and operational context.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold">
                Product
              </p>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <a className="block hover:text-foreground" href="#why-cloudops">
                  Why CloudOps
                </a>

                <a className="block hover:text-foreground" href="#features">
                  Features
                </a>

                <a className="block hover:text-foreground" href="#security">
                  Security
                </a>

                <a className="block hover:text-foreground" href="#how-it-works">
                  How it works
                </a>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">
                Company
              </p>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Link className="block hover:text-foreground" to="/about">
                  About
                </Link>

                <Link className="block hover:text-foreground" to="/contact">
                  Contact
                </Link>

                <Link className="block hover:text-foreground" to="/login">
                  Sign in
                </Link>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold">
                Legal
              </p>

              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <Link className="block hover:text-foreground" to="/privacy">
                  Privacy
                </Link>

                <Link className="block hover:text-foreground" to="/terms">
                  Terms
                </Link>

                <Link className="block hover:text-foreground" to="/impressum">
                  Impressum
                </Link>
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 border-t border-border/50 px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
            <p>
              {"\u00A9"} 2026 CloudOps Insight
            </p>

            <p>
              Built for transparent cloud operations.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

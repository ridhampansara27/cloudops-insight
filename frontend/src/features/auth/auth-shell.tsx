import type {
  ReactNode,
} from "react";

import {
  CloudCog,
  ShieldCheck,
} from "lucide-react";

import {
  LegalFooter,
} from "@/components/legal/legal-footer";


interface AuthShellProps {
  eyebrow: string;

  title: string;

  description: string;

  children: ReactNode;
}


export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: AuthShellProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-[8%] top-[8%] size-[28rem] rounded-full bg-cyan-500/[0.055] blur-3xl"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[5%] right-[8%] size-[30rem] rounded-full bg-violet-500/[0.055] blur-3xl"
      />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-card/70 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:grid-cols-[0.9fr_1.1fr]">
        <section className="relative hidden overflow-hidden border-r border-border/50 bg-background/25 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <CloudCog className="size-6" />
            </div>

            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
              CloudOps Insight
            </p>

            <h1 className="mt-4 max-w-sm text-3xl font-semibold tracking-tight">
              Cloud operations,
              security and FinOps
              in one command center.
            </h1>

            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              Connect AWS securely, understand infrastructure health,
              investigate incidents and control cloud spend from one
              tenant-isolated workspace.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/30 p-4">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />

              <div>
                <p className="text-sm font-medium">
                  Security-first onboarding
                </p>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Cross-account IAM access, tenant boundaries and
                  email-verified identities are built into the platform.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
                <CloudCog className="size-5" />
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              {eyebrow}
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight">
              {title}
            </h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {description}
            </p>

            <div className="mt-8">
              {children}
            </div>

            <LegalFooter
              className="mt-8 border-t border-border/50 pt-5"
              compact
            />
          </div>
        </section>
      </div>
    </main>
  );
}
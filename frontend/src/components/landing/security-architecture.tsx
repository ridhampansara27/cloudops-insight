import {
  ArrowDown,
  CheckCircle2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

const securityItems = [
  "Read-oriented AWS integration model",
  "Cross-account IAM role with ExternalId protection",
  "Tenant-isolated workspace boundaries",
  "Explicit disconnect and permanent integration removal flows",
] as const;

export function SecurityArchitecture() {
  return (
    <div className="mx-auto grid w-full max-w-[340px] gap-6 sm:max-w-none lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
      <div className="cloudops-glass rounded-3xl border border-border/60 p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Security architecture
        </p>

        <h3 className="mt-4 text-2xl font-semibold">
          Connect AWS without giving up operational control.
        </h3>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          CloudOps Insight is designed around cross-account AWS access for
          visibility and analysis, while customer data remains separated by
          tenant-isolated workspace boundaries.
        </p>

        <div className="mt-8 grid gap-5">
          <div className="rounded-3xl border border-border/60 bg-background/25 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300">
                <ShieldCheck className="size-5" />
              </span>

              <div>
                <p className="font-medium">
                  Customer AWS account
                </p>
                <p className="text-xs text-muted-foreground">
                  EC2 • S3 • CloudWatch • Cost Explorer
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-2 text-sm text-emerald-300">
              Read-only IAM role + ExternalId
            </div>
          </div>

          <div className="flex justify-center text-emerald-300">
            <ArrowDown className="size-5" />
          </div>

          <div className="rounded-3xl border border-border/60 bg-background/25 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-400/[0.08] text-violet-300">
                <LockKeyhole className="size-5" />
              </span>

              <div>
                <p className="font-medium">
                  CloudOps Insight workspace
                </p>
                <p className="text-xs text-muted-foreground">
                  Inventory • FinOps • Monitoring • Incidents
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          {securityItems.map((item) => (
            <div
              className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/20 px-4 py-3"
              key={item}
            >
              <CheckCircle2 className="size-5 shrink-0 text-emerald-300" />
              <span className="text-sm">
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-3xl border border-border/60 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <KeyRound className="size-5 text-cyan-300" />
            <p className="font-semibold">
              Integration lifecycle
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-border/50 bg-background/25 p-4">
              <p className="text-sm font-medium">
                1. Connect AWS
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Configure a cross-account IAM role with the CloudOps-generated
                ExternalId.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/25 p-4">
              <p className="text-sm font-medium">
                2. Synchronize data
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Import supported inventory, AWS cost records and monitoring
                signals into the workspace.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/25 p-4">
              <p className="text-sm font-medium">
                3. Disconnect if needed
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Stop future synchronization while optionally retaining imported
                CloudOps history.
              </p>
            </div>

            <div className="rounded-2xl border border-border/50 bg-background/25 p-4">
              <p className="text-sm font-medium">
                4. Permanently remove
              </p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Remove the CloudOps integration and imported CloudOps-side data
                without deleting AWS resources.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Transparency
          </p>

          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            CloudOps Insight is being hardened for commercial readiness with
            dedicated tenant-security validation, backup/restore proof and
            customer lifecycle testing.
          </p>
        </div>
      </div>
    </div>
  );
}
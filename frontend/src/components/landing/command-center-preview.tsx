import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Cloud,
  Database,
  Server,
  ShieldCheck,
  WalletCards,
} from "lucide-react";


const resources = [
  {
    name: "api-prod-01",
    type: "EC2",
    state: "Healthy",
    stateClass:
      "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
  },
  {
    name: "worker-prod-02",
    type: "EC2",
    state: "Attention",
    stateClass:
      "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
  },
  {
    name: "audit-archive",
    type: "S3",
    state: "Active",
    stateClass:
      "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300",
  },
] as const;


export function CommandCenterPreview() {
  return (
    <section className="relative mx-auto w-full max-w-[340px] sm:max-w-none">
      <div
        aria-hidden="true"
        className="absolute -inset-10 rounded-full bg-cyan-500/[0.09] blur-3xl"
      />

      <div className="landing-product-glow relative overflow-hidden rounded-[30px] border border-cyan-400/10 bg-[#07101d]/90 shadow-2xl shadow-black/35 backdrop-blur-xl">
        <div className="flex flex-col items-start gap-4 border-b border-white/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300">
              <Cloud className="size-5" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold">
                  Production AWS
                </p>

                <span className="rounded-full border border-border/60 bg-white/[0.03] px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Illustrative preview
                </span>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Infrastructure, monitoring and FinOps workspace
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1.5 text-xs text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            Sync current
          </div>
        </div>


        <div className="grid grid-cols-2 gap-px border-b border-white/[0.06] bg-white/[0.05] md:grid-cols-4">
          <div className="bg-[#07101d] p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Server className="size-4 text-cyan-300" />
              Resources
            </div>

            <p className="mt-3 text-2xl font-semibold">
              38
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              synchronized
            </p>
          </div>

          <div className="bg-[#07101d] p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="size-4 text-emerald-300" />
              Health
            </div>

            <p className="mt-3 text-2xl font-semibold">
              94%
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              healthy
            </p>
          </div>

          <div className="bg-[#07101d] p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <WalletCards className="size-4 text-violet-300" />
              MTD spend
            </div>

            <p className="mt-3 text-2xl font-semibold">
              {"\u20AC"}284
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              Cost Explorer
            </p>
          </div>

          <div className="bg-[#07101d] p-5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="size-4 text-amber-300" />
              Incidents
            </div>

            <p className="mt-3 text-2xl font-semibold">
              2
            </p>

            <p className="mt-1 text-[11px] text-muted-foreground">
              open
            </p>
          </div>
        </div>


        <div className="grid gap-4 p-3.5 sm:p-5 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl border border-white/[0.07] bg-black/[0.12] p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  Cloud spend trend
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  AWS Cost Explorer • last 7 days
                </p>
              </div>

              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/[0.06] px-2.5 py-1 text-[11px] text-emerald-300">
                <ArrowUpRight className="size-3" />
                Synced
              </span>
            </div>

            <div className="relative mt-6 h-36">
              <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-white/[0.06]" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-white/[0.06]" />
              <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-white/[0.06]" />

              <div className="absolute inset-0 flex items-end gap-2">
                <div className="h-[34%] flex-1 rounded-t-lg bg-cyan-400/20" />
                <div className="h-[45%] flex-1 rounded-t-lg bg-cyan-400/27" />
                <div className="h-[39%] flex-1 rounded-t-lg bg-cyan-400/33" />
                <div className="h-[61%] flex-1 rounded-t-lg bg-cyan-400/42" />
                <div className="h-[55%] flex-1 rounded-t-lg bg-cyan-400/48" />
                <div className="h-[72%] flex-1 rounded-t-lg bg-cyan-400/60" />
                <div className="h-[66%] flex-1 rounded-t-lg bg-cyan-300/75" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Top service
                </p>

                <p className="mt-1 text-xs font-medium">
                  EC2 - Other
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Billing source
                </p>

                <p className="mt-1 text-xs font-medium">
                  Cost Explorer
                </p>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  Currency
                </p>

                <p className="mt-1 text-xs font-medium">
                  EUR / USD
                </p>
              </div>
            </div>
          </div>


          <div className="rounded-3xl border border-white/[0.07] bg-black/[0.12] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  Resource health
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Latest synchronized state
                </p>
              </div>

              <Database className="size-4 text-cyan-300" />
            </div>

            <div className="mt-5 space-y-3">
              {resources.map((resource) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3.5"
                  key={resource.name}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {resource.name}
                    </p>

                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {resource.type} • eu-central-1
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] ${resource.stateClass}`}
                  >
                    {resource.state}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>


        <div className="grid grid-cols-2 gap-px border-t border-white/[0.06] bg-white/[0.05] md:grid-cols-4">
          <div className="flex items-center gap-2 bg-[#07101d] px-4 py-3 text-xs text-muted-foreground">
            <Activity className="size-3.5 text-emerald-300" />
            CloudWatch
          </div>

          <div className="flex items-center gap-2 bg-[#07101d] px-4 py-3 text-xs text-muted-foreground">
            <BarChart3 className="size-3.5 text-violet-300" />
            Cost Explorer
          </div>

          <div className="flex items-center gap-2 bg-[#07101d] px-4 py-3 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-cyan-300" />
            Tenant isolated
          </div>

          <div className="flex items-center gap-2 bg-[#07101d] px-4 py-3 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-emerald-300" />
            Recommendations
          </div>
        </div>
      </div>
    </section>
  );
}
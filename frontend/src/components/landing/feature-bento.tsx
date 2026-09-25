import {
  Activity,
  AlertTriangle,
  BarChart3,
  CloudCog,
  Lightbulb,
  Server,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

const cards = [
  {
    title: "Resource Explorer",
    description:
      "Search synchronized AWS infrastructure with provider identifiers, state, metadata and ownership context.",
    icon: Server,
    tone: "cyan",
    span: "lg:col-span-2",
    visual: "inventory",
  },
  {
    title: "FinOps Visibility",
    description:
      "Bring AWS Cost Explorer billing context into the same workspace as your infrastructure.",
    icon: WalletCards,
    tone: "violet",
    span: "",
    visual: "costs",
  },
  {
    title: "CloudWatch Monitoring",
    description:
      "Synchronize supported AWS metrics and keep telemetry attached to the affected resources.",
    icon: Activity,
    tone: "emerald",
    span: "",
    visual: "metrics",
  },
  {
    title: "Resource Health",
    description:
      "Combine cloud state and monitoring signals to evaluate operational health faster.",
    icon: ShieldCheck,
    tone: "emerald",
    span: "",
    visual: "health",
  },
  {
    title: "Incident Management",
    description:
      "Investigate issues with direct links back to the resources they affect.",
    icon: AlertTriangle,
    tone: "amber",
    span: "",
    visual: "incidents",
  },
  {
    title: "Recommendations",
    description:
      "Expose actionable optimization opportunities beside cloud cost and operational data.",
    icon: Lightbulb,
    tone: "cyan",
    span: "lg:col-span-2",
    visual: "recommendations",
  },
] as const;

function toneClasses(tone: string) {
  switch (tone) {
    case "violet":
      return "border-violet-400/20 bg-violet-400/[0.08] text-violet-300";
    case "emerald":
      return "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300";
    case "amber":
      return "border-amber-400/20 bg-amber-400/[0.08] text-amber-300";
    default:
      return "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-300";
  }
}

function renderVisual(visual: string) {
  switch (visual) {
    case "inventory":
      return (
        <div className="mt-6 grid gap-3 sm:grid-cols-[0.7fr_1.3fr]">
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <p className="text-xs text-muted-foreground">
              Inventory
            </p>

            <p className="mt-3 text-3xl font-semibold">
              38
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Synchronized resources
            </p>

            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-cyan-300">
                EC2
              </span>

              <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-cyan-300">
                S3
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Recent resources
              </p>

              <span className="text-[11px] text-cyan-300">
                Resource Explorer
              </span>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/25 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    api-prod-01
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    EC2 • eu-central-1
                  </p>
                </div>

                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2 py-1 text-[11px] text-emerald-300">
                  healthy
                </span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/25 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">
                    cloudops-audit-archive
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    S3 • eu-central-1
                  </p>
                </div>

                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2 py-1 text-[11px] text-cyan-300">
                  active
                </span>
              </div>
            </div>
          </div>
        </div>
      );

    case "costs":
      return (
        <div className="mt-6">
          <div className="flex h-24 items-end gap-2">
            <div className="h-[28%] flex-1 rounded-t-xl bg-violet-400/25" />
            <div className="h-[42%] flex-1 rounded-t-xl bg-violet-400/35" />
            <div className="h-[34%] flex-1 rounded-t-xl bg-violet-400/40" />
            <div className="h-[60%] flex-1 rounded-t-xl bg-violet-400/50" />
            <div className="h-[48%] flex-1 rounded-t-xl bg-violet-300/65" />
          </div>

          <div className="mt-4 rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm">
            Top cost driver:
            <span className="ml-2 text-muted-foreground">
              EC2 - Other
            </span>
          </div>
        </div>
      );

    case "metrics":
      return (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm">
            CPUUtilization
            <span className="float-right text-emerald-300">
              healthy
            </span>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm">
            NetworkIn
            <span className="float-right text-cyan-300">
              active
            </span>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 px-4 py-3 text-sm">
            NetworkOut
            <span className="float-right text-cyan-300">
              active
            </span>
          </div>
        </div>
      );

    case "health":
      return (
        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <p className="text-2xl font-semibold text-emerald-300">
              24
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Healthy
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <p className="text-2xl font-semibold text-amber-300">
              3
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Observe
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <p className="text-2xl font-semibold text-rose-300">
              1
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Attention
            </p>
          </div>
        </div>
      );

    case "incidents":
      return (
        <div className="mt-6 space-y-3">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
            <p className="text-sm font-medium">
              Elevated latency on worker-prod-02
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Linked resource: EC2 instance
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
            <p className="text-sm font-medium">
              Cost anomaly review pending
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Linked domain: FinOps
            </p>
          </div>
        </div>
      );

    default:
      return (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-center">
            <BarChart3 className="mx-auto size-4 text-cyan-300" />
            <p className="mt-3 text-xs text-muted-foreground">
              Cost
            </p>
            <p className="mt-1 font-semibold">
              Context
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-center">
            <Activity className="mx-auto size-4 text-emerald-300" />
            <p className="mt-3 text-xs text-muted-foreground">
              Health
            </p>
            <p className="mt-1 font-semibold">
              Signals
            </p>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background/30 p-4 text-center">
            <CloudCog className="mx-auto size-4 text-violet-300" />
            <p className="mt-3 text-xs text-muted-foreground">
              Actions
            </p>
            <p className="mt-1 font-semibold">
              Suggested
            </p>
          </div>
        </div>
      );
  }
}

export function FeatureBento() {
  return (
    <div className="mx-auto grid w-full max-w-[340px] gap-4 sm:max-w-none lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            className={`cloudops-interactive rounded-3xl border border-border/60 bg-card/55 p-6 ${card.span}`}
            key={card.title}
          >
            <div className={`flex size-11 items-center justify-center rounded-2xl border ${toneClasses(card.tone)}`}>
              <Icon className="size-5" />
            </div>

            <h3 className="mt-5 text-xl font-semibold">
              {card.title}
            </h3>

            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {card.description}
            </p>

            {renderVisual(card.visual)}
          </article>
        );
      })}
    </div>
  );
}
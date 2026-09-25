import {
  useMemo,
  useState,
} from "react";

type PreviewKey =
  | "overview"
  | "resources"
  | "costs"
  | "health"
  | "incidents";

const tabs: ReadonlyArray<{
  key: PreviewKey;
  label: string;
}> = [
  {
    key: "overview",
    label: "Overview",
  },
  {
    key: "resources",
    label: "Resources",
  },
  {
    key: "costs",
    label: "Costs",
  },
  {
    key: "health",
    label: "Health",
  },
  {
    key: "incidents",
    label: "Incidents",
  },
];

export function ProductPreview() {
  const [activePreview, setActivePreview] =
    useState<PreviewKey>("overview");

  const content = useMemo(() => {
    switch (activePreview) {
      case "resources":
        return {
          eyebrow: "Resource Explorer",
          title: "Inspect cloud inventory with operational context.",
          description:
            "Search synchronized AWS resources and inspect cloud state, service type, region and ownership in a single workspace.",
          body: (
            <div className="grid gap-3">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      i-04f9f22bfcade005b
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      EC2 • eu-central-1
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-xs text-emerald-300">
                    healthy
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      cloudops-insight-terraform-state-902664897666
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      S3 • eu-central-1
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-300">
                    available
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Inventory facts
                </p>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-border/50 bg-background/30 p-3">
                    Service types
                    <span className="mt-1 block font-medium">
                      EC2 / S3
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/30 p-3">
                    Cloud state
                    <span className="mt-1 block font-medium">
                      running / available
                    </span>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-background/30 p-3">
                    Health linkage
                    <span className="mt-1 block font-medium">
                      supported
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ),
        };

      case "costs":
        return {
          eyebrow: "FinOps",
          title: "Turn AWS billing into infrastructure-aware insight.",
          description:
            "CloudOps Insight brings Cost Explorer data into the same workspace so cloud spend is easier to understand and discuss.",
          body: (
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Month-to-date
                </p>
                <p className="mt-3 text-3xl font-semibold">
                  €284
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Imported from AWS Cost Explorer
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Top service contributors
                </p>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/25 px-3 py-2">
                    <span>EC2 - Other</span>
                    <span className="font-medium">€22.7</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/25 px-3 py-2">
                    <span>Elastic Load Balancing</span>
                    <span className="font-medium">€0.1</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-border/40 bg-background/25 px-3 py-2">
                    <span>Amazon S3</span>
                    <span className="font-medium">tracked</span>
                  </div>
                </div>
              </div>
            </div>
          ),
        };

      case "health":
        return {
          eyebrow: "Monitoring + health",
          title: "Evaluate cloud health from synchronized telemetry.",
          description:
            "Supported CloudWatch metrics stay linked to resources, helping teams reason about CPU, network activity and operational state.",
          body: (
            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Metric samples
                </p>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border/40 bg-background/25 px-3 py-2 text-sm">
                    CPUUtilization
                    <span className="float-right text-emerald-300">
                      Average
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background/25 px-3 py-2 text-sm">
                    NetworkIn
                    <span className="float-right text-cyan-300">
                      Sum
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/40 bg-background/25 px-3 py-2 text-sm">
                    NetworkOut
                    <span className="float-right text-cyan-300">
                      Sum
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Health distribution
                </p>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl border border-border/50 bg-background/25 p-4">
                    <p className="text-2xl font-semibold text-emerald-300">
                      24
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      healthy
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/25 p-4">
                    <p className="text-2xl font-semibold text-amber-300">
                      3
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      observe
                    </p>
                  </div>

                  <div className="rounded-xl border border-border/50 bg-background/25 p-4">
                    <p className="text-2xl font-semibold text-rose-300">
                      1
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      attention
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ),
        };

      case "incidents":
        return {
          eyebrow: "Incident management",
          title: "Keep issues connected to affected infrastructure.",
          description:
            "Incidents are easier to triage when operational issues remain linked to the synchronized resources and monitoring context behind them.",
          body: (
            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Elevated latency on worker-prod-02
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Related resource: EC2 • worker-prod-02
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2.5 py-1 text-xs text-amber-300">
                    investigating
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Cost anomaly review
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Linked domain: FinOps
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-2.5 py-1 text-xs text-cyan-300">
                    open
                  </span>
                </div>
              </div>
            </div>
          ),
        };

      default:
        return {
          eyebrow: "Command center",
          title: "One operational view for cloud teams.",
          description:
            "CloudOps Insight brings infrastructure, spend, health, incidents and recommendations together so teams can understand AWS operations without constantly switching context.",
          body: (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  AWS resources
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  Synchronized
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Inventory from supported services
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Cloud spend
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  Tracked
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Cost Explorer integration
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-background/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Health posture
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  Evaluated
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Monitoring + cloud state context
                </p>
              </div>
            </div>
          ),
        };
    }
  }, [activePreview]);

  return (
    <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          Interactive product tour
        </p>

        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Explore the CloudOps workflow before connecting AWS.
        </h2>

        <p className="mt-5 max-w-xl text-sm leading-7 text-muted-foreground">
          Switch between product views to understand how CloudOps Insight
          organizes infrastructure, cost and operational information.
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              aria-pressed={activePreview === tab.key}
              className={
                activePreview === tab.key
                  ? "rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                  : "rounded-xl border border-border/60 bg-card/40 px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
              }
              key={tab.key}
              onClick={() => setActivePreview(tab.key)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cloudops-glass mx-auto w-full max-w-[340px] rounded-3xl border border-border/60 p-4 shadow-2xl shadow-black/20 sm:max-w-none sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
          {content.eyebrow}
        </p>

        <h3 className="mt-3 text-2xl font-semibold">
          {content.title}
        </h3>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
          {content.description}
        </p>

        <div className="mt-7">
          {content.body}
        </div>
      </div>
    </div>
  );
}
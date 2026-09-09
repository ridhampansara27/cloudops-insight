// Import FinOps visualization icon.
import {
  BarChart3,
  CircleDollarSign,
} from "lucide-react";

// Import reusable cards.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import billing-safe monetary formatting.
import {
  formatBillingAmount,
} from "@/lib/formatters";

// Import the genuine API cost model.
import type {
  ServiceCostApiResponse,
} from "@/types/api";


// Define component properties.
interface CostByServiceProps {
  // Genuine aggregated service costs from FastAPI.
  services:
    ServiceCostApiResponse[];

  // Genuine month-to-date total.
  total: number;

  // Backend reporting currency.
  currency: string;
}


// Export the API-driven service-cost visualization.
export function CostByService({
  services,
  total,
  currency,
}: CostByServiceProps) {
  // Use positive AWS service charges as a fallback denominator
  // when credits make the net month total non-positive.
  const positiveServiceTotal =
    services.reduce(
      (
        sum,
        service,
      ) =>
        sum +
        Math.max(
          service.amount,
          0,
        ),
      0,
    );

  const allocationTotal =
    total > 0
      ? total
      : positiveServiceTotal;

  // Render the FinOps command card.
  return (
    <Card className="overflow-hidden bg-card/72">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-start justify-between gap-5">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="size-4 text-sky-300" />

              Cost by service
            </CardTitle>

            <CardDescription className="mt-1">
              Month-to-date AWS spending grouped by billing service.
            </CardDescription>
          </div>

          <div className="text-right">
            <p className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
              MTD spend
            </p>

            <p className="mt-1 text-xl font-semibold tracking-tight">
              {formatBillingAmount(
                total,
                currency,
              )}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {services.length ===
        0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl border border-sky-400/15 bg-sky-400/8 text-sky-300">
              <CircleDollarSign className="size-5" />
            </div>

            <p className="mt-4 font-semibold">
              No synchronized billing data
            </p>

            <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">
              AWS service costs will appear here after Cost Explorer
              synchronization completes.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {services.map(
              (
                service,
                index,
              ) => {
                // Calculate a genuine positive-spend share.
                const percentage =
                  allocationTotal <=
                  0
                    ? 0
                    : (
                        Math.max(
                          service.amount,
                          0,
                        ) /
                        allocationTotal
                      ) *
                      100;

                // Render one AWS billing service.
                return (
                  <div
                    key={
                      service.service
                    }
                    className="group rounded-xl border border-transparent px-2 py-2.5 transition-all duration-200 hover:border-primary/15 hover:bg-accent/25"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/30 text-[11px] font-semibold text-muted-foreground">
                        {
                          index +
                          1
                        }
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-4">
                          <p className="truncate text-sm font-medium">
                            {
                              service.service
                            }
                          </p>

                          <p className="shrink-0 text-sm font-semibold">
                            {formatBillingAmount(
                              service.amount,
                              currency,
                            )}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 shadow-[0_0_12px_rgba(56,189,248,0.35)] transition-[width] duration-500"
                              style={{
                                width:
                                  `${Math.min(
                                    percentage,
                                    100,
                                  )}%`,
                              }}
                            />
                          </div>

                          <span className="w-12 text-right text-[11px] tabular-nums text-muted-foreground">
                            {percentage.toFixed(
                              1,
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

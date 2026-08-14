// Import reusable card components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Import shared monetary formatting.
import {
  formatCurrency,
} from "@/lib/formatters";

// Import the real API response type.
import type {
  ServiceCostApiResponse,
} from "@/types/api";


// Define component properties.
interface CostByServiceProps {
  // Supply aggregated service costs from FastAPI.
  services: ServiceCostApiResponse[];

  // Supply total month-to-date spending.
  total: number;

  // Supply the backend billing currency.
  currency: string;
}


// Export the API-driven service-cost component.
export function CostByService({
  // Receive service costs.
  services,

  // Receive total spending.
  total,

  // Receive billing currency.
  currency,
}: CostByServiceProps) {
  // Render service cost distribution.
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Cost by service
        </CardTitle>

        <CardDescription>
          Month-to-date cloud spending grouped by service.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {services.length === 0 ? (
          <div className="py-10 text-center">
            <p className="font-medium">
              No cost data available
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Billing records will appear after cost synchronization.
            </p>
          </div>
        ) : (
          services.map(
            (service) => {
              // Calculate this service's share of overall spending.
              const percentage =
                total <= 0
                  ? 0
                  : (
                      service.amount /
                      total
                    ) *
                    100;

              // Render one service.
              return (
                <div
                  key={
                    service.service
                  }
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {
                          service.service
                        }
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {
                          percentage.toFixed(
                            1,
                          )
                        }
                        % of spend
                      </p>
                    </div>

                    <p className="text-sm font-semibold">
                      {formatCurrency(
                        service.amount,
                        currency,
                      )}
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${Math.min(
                          percentage,
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              );
            },
          )
        )}
      </CardContent>
    </Card>
  );
}
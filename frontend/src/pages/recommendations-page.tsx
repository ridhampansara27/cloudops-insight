// Import React utilities.
import {
  useMemo,
  useState,
} from "react";

// Import optimization icon.
import { Lightbulb } from "lucide-react";

// Import reusable UI elements.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import recommendation data.
import { mockRecommendations } from "@/mocks/recommendations";

// Import recommendation model.
import type {
  Recommendation,
  RecommendationStatus,
} from "@/types/recommendation";

// Format estimated savings.
function formatCurrency(value: number): string {
  // Return euro currency.
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(value);
}

// Export recommendation management.
export function RecommendationsPage() {
  // Store recommendations locally.
  const [recommendations, setRecommendations] =
    useState<Recommendation[]>(
      mockRecommendations,
    );

  // Store risk filter.
  const [riskFilter, setRiskFilter] =
    useState("all");

  // Store status filter.
  const [statusFilter, setStatusFilter] =
    useState("all");

  // Calculate filtered recommendations.
  const filteredRecommendations =
    useMemo(
      () =>
        recommendations.filter(
          (recommendation) => {
            // Match risk.
            const matchesRisk =
              riskFilter === "all" ||
              recommendation.risk ===
                riskFilter;

            // Match status.
            const matchesStatus =
              statusFilter === "all" ||
              recommendation.status ===
                statusFilter;

            // Return matching records.
            return (
              matchesRisk &&
              matchesStatus
            );
          },
        ),
      [
        recommendations,
        riskFilter,
        statusFilter,
      ],
    );

  // Update one recommendation.
  function updateStatus(
    recommendationId: string,
    status: RecommendationStatus,
  ) {
    // Update the local state.
    setRecommendations((current) =>
      current.map(
        (recommendation) =>
          recommendation.id ===
          recommendationId
            ? {
                ...recommendation,
                status,
              }
            : recommendation,
      ),
    );
  }

  // Calculate total open saving opportunity.
  const potentialSavings =
    recommendations
      .filter(
        (recommendation) =>
          recommendation.status ===
          "open",
      )
      .reduce(
        (total, recommendation) =>
          total +
          recommendation.estimatedMonthlySavings,
        0,
      );

  // Render the page.
  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          FinOps optimization
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Recommendations
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Identify cloud resources with potential cost, capacity,
          and operational-efficiency improvements.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Open opportunities
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                recommendations.filter(
                  (recommendation) =>
                    recommendation.status ===
                    "open",
                ).length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Potential monthly savings
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(
                potentialSavings,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              High-confidence recommendations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                recommendations.filter(
                  (recommendation) =>
                    recommendation.confidence ===
                    "high",
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <NativeSelect
              value={riskFilter}
              onChange={(event) =>
                setRiskFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All risk levels
              </NativeSelectOption>

              <NativeSelectOption value="low">
                Low risk
              </NativeSelectOption>

              <NativeSelectOption value="medium">
                Medium risk
              </NativeSelectOption>

              <NativeSelectOption value="high">
                High risk
              </NativeSelectOption>
            </NativeSelect>

            <NativeSelect
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <NativeSelectOption value="all">
                All statuses
              </NativeSelectOption>

              <NativeSelectOption value="open">
                Open
              </NativeSelectOption>

              <NativeSelectOption value="accepted">
                Accepted
              </NativeSelectOption>

              <NativeSelectOption value="dismissed">
                Dismissed
              </NativeSelectOption>
            </NativeSelect>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {filteredRecommendations.map(
          (recommendation) => (
            <Card key={recommendation.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {recommendation.risk} risk
                      </Badge>

                      <Badge variant="secondary">
                        {recommendation.confidence} confidence
                      </Badge>

                      <Badge variant="outline">
                        {recommendation.status}
                      </Badge>
                    </div>

                    <CardTitle className="mt-3">
                      {recommendation.title}
                    </CardTitle>

                    <CardDescription className="mt-2">
                      {recommendation.resourceName} ·{" "}
                      {recommendation.service}
                    </CardDescription>
                  </div>

                  <Lightbulb className="size-5 text-primary" />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {recommendation.description}
                </p>

                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Evidence
                  </p>

                  <p className="mt-2 text-sm">
                    {recommendation.evidence}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground">
                    Estimated monthly saving
                  </p>

                  <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(
                      recommendation.estimatedMonthlySavings,
                    )}
                  </p>
                </div>

                {recommendation.status ===
                  "open" && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        updateStatus(
                          recommendation.id,
                          "accepted",
                        )
                      }
                    >
                      Accept
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateStatus(
                          recommendation.id,
                          "dismissed",
                        )
                      }
                    >
                      Dismiss
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ),
        )}
      </div>
    </section>
  );
}
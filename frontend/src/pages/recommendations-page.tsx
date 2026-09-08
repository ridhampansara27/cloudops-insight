// Import React utilities.
import {
  useMemo,
  useState,
} from "react";

// Import optimization icon.
import { Lightbulb } from "lucide-react";

// Import notifications.
import {
  toast,
} from "sonner";

// Import real recommendation APIs.
import {
  useRecommendations,
  useUpdateRecommendationStatus,
} from "@/features/recommendations/api/recommendations-api";

// Import resources for display names.
import {
  useResources,
} from "@/features/resources/api/resources-api";

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

// Import numeric formatting.
import {
  formatCurrency,
  toNumber,
} from "@/lib/formatters";

// Export recommendation management.
export function RecommendationsPage() {
  // Load recommendations from FastAPI.
  const recommendationsQuery =
    useRecommendations();

  // Load resource inventory.
  const resourcesQuery =
    useResources({
      // Use first page.
      page: 1,

      // Load full demonstration inventory.
      pageSize: 100,
    });

  // Create recommendation mutation.
  const updateRecommendation =
    useUpdateRecommendationStatus();

  // Memoize backend recommendations so the array reference
  // remains stable between renders.
  const recommendations =
    useMemo(
      () =>
        recommendationsQuery.data ?? [],
      [
        recommendationsQuery.data,
      ],
    );

  // Create resource UUID-to-resource lookup.
  const resourceLookup =
    new Map(
      (
        resourcesQuery.data
          ?.items ??
        []
      ).map(
        (resource) => [
          // Store the resource UUID.
          resource.id,

          // Store the complete resource.
          resource,
        ],
      ),
    );

  // Store risk filter.
  const [
    riskFilter,
    setRiskFilter,
  ] =
    useState("all");

  // Store status filter.
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState("all");

  // Calculate filtered recommendations.
  const filteredRecommendations =
    useMemo(
      () =>
        recommendations.filter(
          (recommendation) => {
            // Match selected risk.
            const matchesRisk =
              riskFilter === "all" ||
              recommendation.risk ===
                riskFilter;

            // Match selected workflow status.
            const matchesStatus =
              statusFilter === "all" ||
              recommendation.status ===
                statusFilter;

            // Require both filters to match.
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

  // Calculate real open monthly saving opportunity.
  const potentialSavings =
    (
      recommendationsQuery.data ??
      []
    )
      .filter(
        (recommendation) =>
          recommendation.status ===
          "open",
      )
      .reduce(
        (
          total,
          recommendation,
        ) =>
          total +
          toNumber(
            recommendation
              .estimated_monthly_savings ?? 0,
          ),
        0,
      );

  // Persist recommendation workflow changes.
  async function handleStatusChange(
    // Identify recommendation.
    recommendationId: string,

    // Supply workflow state.
    nextStatus: string,
  ) {
    try {
      // Persist status through FastAPI.
      await updateRecommendation.mutateAsync({
        // Supply recommendation ID.
        id:
          recommendationId,

        // Supply status.
        status:
          nextStatus,
      });

      // Confirm persistence.
      toast.success(
        "Recommendation updated.",
      );
    } catch {
      // Display API failure.
      toast.error(
        "Unable to update recommendation.",
      );
    }
  }

  // Render the page.
  return (
    <section className="space-y-6">
      {/* Display page heading. */}
      <div>
        {/* Display FinOps section label. */}
        <p className="text-sm font-medium text-primary">
          FinOps optimization
        </p>

        {/* Display page title. */}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Recommendations
        </h1>

        {/* Explain optimization recommendations. */}
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Identify cloud resources with potential cost, capacity,
          and operational-efficiency improvements.
        </p>
      </div>

      {/* Display loading feedback while recommendations are requested. */}
      {recommendationsQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading recommendations...
          </CardContent>
        </Card>
      )}

      {/* Display backend failure feedback. */}
      {recommendationsQuery.isError && (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Unable to load recommendations.
          </CardContent>
        </Card>
      )}

      {/* Render recommendation data after loading succeeds. */}
      {!recommendationsQuery.isLoading &&
        !recommendationsQuery.isError && (
          <>
            {/* Display recommendation summary metrics. */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Display open optimization opportunities. */}
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

              {/* Display real potential monthly savings. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Quantified monthly savings
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(
                      potentialSavings,
                      "USD",
                    )}
                  </p>
                </CardContent>
              </Card>

              {/* Display high-confidence recommendation count. */}
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

            {/* Display filtering controls. */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Filter recommendations by risk. */}
                  <NativeSelect
                    value={
                      riskFilter
                    }
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

                  {/* Filter recommendations by workflow status. */}
                  <NativeSelect
                    value={
                      statusFilter
                    }
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

            {/* Display an empty state when no recommendations match. */}
            {filteredRecommendations.length ===
              0 && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="font-medium">
                    No recommendations found
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    No recommendations match the current filters.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Display filtered backend recommendations. */}
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredRecommendations.map(
                (recommendation) => {
                  // Find the resource related to this recommendation.
                  const resource =
                    resourceLookup.get(
                      recommendation.resource_id,
                    );

                  // Render one optimization recommendation.
                  return (
                    <Card
                      key={
                        recommendation.id
                      }
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {/* Display recommendation metadata. */}
                            <div className="flex flex-wrap gap-2">
                              {/* Display recommendation risk. */}
                              <Badge variant="outline">
                                {
                                  recommendation.risk
                                }{" "}
                                risk
                              </Badge>

                              {/* Display recommendation confidence. */}
                              <Badge variant="secondary">
                                {
                                  recommendation.confidence
                                }{" "}
                                confidence
                              </Badge>

                              {/* Display recommendation workflow state. */}
                              <Badge variant="outline">
                                {
                                  recommendation.status
                                }
                              </Badge>
                            </div>

                            {/* Display recommendation title. */}
                            <CardTitle className="mt-3">
                              {
                                recommendation.title
                              }
                            </CardTitle>

                            {/* Display the related resource name and service. */}
                            <CardDescription className="mt-2">
                              {resource
                                ?.name ??
                                recommendation.resource_id}

                              {resource
                                ?.service
                                ? ` · ${resource.service}`
                                : ""}
                            </CardDescription>
                          </div>

                          {/* Display optimization icon. */}
                          <Lightbulb className="size-5 text-primary" />
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-4">
                        {/* Display recommendation description. */}
                        <p className="text-sm text-muted-foreground">
                          {
                            recommendation.description
                          }
                        </p>

                        {/* Display recommendation evidence. */}
                        <div className="rounded-lg border p-4">
                          <p className="text-xs text-muted-foreground">
                            Evidence
                          </p>

                          <p className="mt-2 text-sm">
                            {
                              recommendation.evidence
                            }
                          </p>
                        </div>

                        {/* Display estimated monthly saving when AWS
                            resource-level billing data is available. */}
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Estimated monthly saving
                          </p>

                          <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                            {recommendation
                              .estimated_monthly_savings ===
                            null
                              ? "Estimate unavailable"
                              : formatCurrency(
                                  toNumber(
                                    recommendation
                                      .estimated_monthly_savings,
                                  ),
                                  "USD",
                                )}
                          </p>
                        </div>

                        {/* Allow workflow changes only for open recommendations. */}
                        {recommendation.status ===
                          "open" && (
                          <div className="flex flex-wrap gap-2">
                            {/* Accept the recommendation through FastAPI. */}
                            <Button
                              size="sm"
                              disabled={
                                updateRecommendation.isPending
                              }
                              onClick={() =>
                                void handleStatusChange(
                                  recommendation.id,
                                  "accepted",
                                )
                              }
                            >
                              Accept
                            </Button>

                            {/* Dismiss the recommendation through FastAPI. */}
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                updateRecommendation.isPending
                              }
                              onClick={() =>
                                void handleStatusChange(
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
                  );
                },
              )}
            </div>
          </>
        )}
    </section>
  );
}
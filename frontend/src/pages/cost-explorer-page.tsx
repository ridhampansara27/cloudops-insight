// Import React utilities for filtering.
import { useState } from "react";

// Import page icons.
import {
  Database,
  Search,
} from "lucide-react";

// Import real cost API.
import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import reusable UI components.
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Import monetary formatting.
import {
  formatBillingAmount,
  formatCurrency,
} from "@/lib/formatters";


// Export the production Cost Explorer.
export function CostExplorerPage() {
  // Load genuine AWS Cost Explorer data from FastAPI.
  const costQuery =
    useCostSummary();

  // Store service search text.
  const [
    searchQuery,
    setSearchQuery,
  ] =
    useState("");

  // Display standard loading state.
  if (costQuery.isPending) {
    return (
      <PageLoadingState />
    );
  }

  // Display standard API error state.
  if (costQuery.isError) {
    return (
      <PageErrorState
        title="Unable to load Cost Explorer"
        description="AWS billing records could not be retrieved."
        onRetry={() => {
          void costQuery.refetch();
        }}
      />
    );
  }

  // Store the genuine backend response.
  const costs =
    costQuery.data;

  // Normalize search text.
  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();

  // Filter genuine service-level records.
  const visibleServices =
    costs.by_service.filter(
      (record) =>
        normalizedSearch.length ===
          0 ||
        record.service
          .toLowerCase()
          .includes(
            normalizedSearch,
          ),
    );

  // Calculate the total represented by visible services.
  const visibleCost =
    visibleServices.reduce(
      (
        total,
        record,
      ) =>
        total +
        record.amount,
      0,
    );

  // Determine whether the imported month contains material spend.
  const hasMaterialSpend =
    Math.abs(
      costs.month_to_date,
    ) >= 0.005;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium text-primary">
          FinOps analysis
        </p>

        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
          Cost Explorer
        </h1>

        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Explore AWS Cost Explorer records imported into CloudOps.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Matching services
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                visibleServices.length
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Visible MTD cost
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(
                visibleCost,
                costs.currency,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Cost allocation
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-lg font-semibold">
              {
                costs.resource_level_available
                  ? "Resource level available"
                  : "Service level"
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasMaterialSpend && (
        <Card>
          <CardContent className="py-5">
            <p className="font-medium">
              Only sub-cent AWS billing activity is currently recorded.
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              CloudOps preserves the exact provider values in PostgreSQL,
              while the interface rounds sub-cent amounts for readability.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            Service query
          </CardTitle>

          <CardDescription>
            Filter the genuine AWS service-level billing records for the current month.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <Input
              aria-label="Search AWS billing services"
              value={
                searchQuery
              }
              onChange={(
                event,
              ) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search AWS service..."
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Service costs
          </CardTitle>

          <CardDescription>
            Month-to-date AWS spending grouped by service.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    AWS service
                  </TableHead>

                  <TableHead className="text-right">
                    Month-to-date
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visibleServices.length >
                0 ? (
                  visibleServices.map(
                    (record) => (
                      <TableRow
                        key={
                          record.service
                        }
                      >
                        <TableCell className="font-medium">
                          {
                            record.service
                          }
                        </TableCell>

                        <TableCell className="text-right font-medium">
                          {formatBillingAmount(
                            record.amount,
                            costs.currency,
                          )}
                        </TableCell>
                      </TableRow>
                    ),
                  )
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={
                        2
                      }
                      className="h-32 text-center text-muted-foreground"
                    >
                      No AWS services match the current search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Database className="mt-0.5 size-5 text-primary" />

            <div>
              <CardTitle>
                Resource-level allocation
              </CardTitle>

              <CardDescription className="mt-1">
                {
                  costs.resource_level_available
                    ? "Mapped AWS resource-level billing records are available."
                    : "AWS Cost Explorer resource-level granularity is not currently available for this connected account."
                }
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        {!costs.resource_level_available && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              CloudOps does not substitute demonstration values. Service-level
              AWS costs remain available above, and resource attribution will
              appear when AWS provides resource-level records.
            </p>
          </CardContent>
        )}
      </Card>
    </section>
  );
}

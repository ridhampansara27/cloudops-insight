// Import React state management.
import { useState } from "react";

// Import page icons.
import {
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

// Import notifications.
import {
  toast,
} from "sonner";

// Import the budget dialog.
import {
  BudgetDialog,
} from "@/features/budgets/budget-dialog";

// Import form values.
import type {
  BudgetFormValues,
} from "@/features/budgets/budget-dialog";

// Import real budget APIs.
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/features/budgets/api/budgets-api";

// Import real cost API.
import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

// Import reusable UI components.
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Progress } from "@/components/ui/progress";

// Import API type.
import type {
  BudgetApiResponse,
} from "@/types/api";

// Import numeric/currency helpers.
import {
  formatCurrency,
  toNumber,
} from "@/lib/formatters";

// Export the budget-management screen.
export function BudgetsPage() {
  // Load budgets from PostgreSQL.
  const budgetsQuery =
    useBudgets();

  // Load current cost data.
  const costQuery =
    useCostSummary();

  // Create mutation.
  const createBudget =
    useCreateBudget();

  // Update mutation.
  const updateBudget =
    useUpdateBudget();

  // Delete mutation.
  const deleteBudget =
    useDeleteBudget();

  // Read budgets returned by FastAPI.
  // Use an empty array until the request completes.
  const budgets =
    budgetsQuery.data ?? [];

  // Control the create/edit dialog.
  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  // Store the budget being edited.
  const [
    selectedBudget,
    setSelectedBudget,
  ] =
    useState<
      BudgetApiResponse | null
    >(null);

  // Open the dialog for a new budget.
  function handleCreate() {
    // Ensure no existing budget is selected.
    setSelectedBudget(null);

    // Open the dialog.
    setDialogOpen(true);
  }

  // Open the dialog for editing.
  function handleEdit(
    budget: BudgetApiResponse,
  ) {
    // Store the selected backend budget.
    setSelectedBudget(
      budget,
    );

    // Open the dialog.
    setDialogOpen(true);
  }

  // Save a newly created or edited budget.
  async function handleSave(
    values: BudgetFormValues,
  ) {
    try {
      // Update an existing budget.
      if (
        selectedBudget
      ) {
        await updateBudget.mutateAsync({
          // Identify budget.
          id:
            selectedBudget.id,

          // Update display name.
          name:
            values.name,

          // Update limit.
          monthly_limit:
            values.monthlyLimit,

          // Update warning level.
          warning_threshold:
            values.warningThreshold,

          // Update critical level.
          critical_threshold:
            values.criticalThreshold,
        });

        // Confirm success.
        toast.success(
          "Budget updated.",
        );

        // Finish edit operation.
        return;
      }

      // Create a new budget.
      await createBudget.mutateAsync({
        // Store display name.
        name:
          values.name,

        // Store scope type.
        scope_type:
          values.scopeType,

        // Store scope value.
        scope_value:
          values.scopeValue,

        // Store monthly limit.
        monthly_limit:
          values.monthlyLimit,

        // Store warning threshold.
        warning_threshold:
          values.warningThreshold,

        // Store critical threshold.
        critical_threshold:
          values.criticalThreshold,
      });

      // Confirm creation.
      toast.success(
        "Budget created.",
      );
    } catch {
      // Keep the dialog open and inform the user.
      toast.error(
        "Unable to save budget.",
      );

      // Rethrow so BudgetDialog does not close.
      throw new Error(
        "Budget save failed.",
      );
    }
  }

  // Delete a budget from PostgreSQL.
  async function handleDelete(
    budget: BudgetApiResponse,
  ) {
    // Request explicit confirmation.
    const confirmed =
      window.confirm(
        `Delete "${budget.name}"?`,
      );

    // Stop when cancelled.
    if (!confirmed) {
      return;
    }

    try {
      // Delete through FastAPI.
      await deleteBudget.mutateAsync(
        budget.id,
      );

      // Confirm success.
      toast.success(
        "Budget deleted.",
      );
    } catch {
      // Display mutation failure.
      toast.error(
        "Unable to delete budget.",
      );
    }
  }

  // Count budgets that are currently active.
  const activeBudgetCount =
    budgets.filter(
      (budget) =>
        budget.is_active,
    ).length;

  // Calculate the total configured monthly limit.
  const totalConfiguredLimit =
    budgets.reduce(
      (
        total,
        budget,
      ) =>
        total +
        toNumber(
          budget.monthly_limit,
        ),
      0,
    );

  // Render the budget-management screen.
  return (
    <section className="space-y-6">
      {/* Display the page heading and creation action. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {/* Display the FinOps section label. */}
          <p className="text-sm font-medium text-primary">
            FinOps governance
          </p>

          {/* Display the page title. */}
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Budgets
          </h1>

          {/* Explain the purpose of cloud budgets. */}
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Define spending limits for accounts, services, environments,
            and teams.
          </p>
        </div>

        {/* Open the budget creation dialog. */}
        <Button
          onClick={
            handleCreate
          }
        >
          {/* Display the creation icon. */}
          <Plus className="mr-2 size-4" />

          Create budget
        </Button>
      </div>

      {/* Display an API loading state. */}
      {budgetsQuery.isLoading && (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            Loading budgets...
          </CardContent>
        </Card>
      )}

      {/* Display an API error state. */}
      {budgetsQuery.isError && (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">
            Unable to load budgets.
          </CardContent>
        </Card>
      )}

      {/* Display budget summary metrics after loading succeeds. */}
      {!budgetsQuery.isLoading &&
        !budgetsQuery.isError && (
          <>
            {/* Display top-level budget statistics. */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Display active budget count. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Active budgets
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {
                      activeBudgetCount
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Display the combined configured limit. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Total configured limit
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(
                      totalConfiguredLimit,
                    )}
                  </p>
                </CardContent>
              </Card>

              {/* Explain the current scope of cost evaluation. */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>
                    Cost evaluation
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <p className="text-sm font-medium">
                    Account-level available
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Detailed scoped cost allocation is coming next.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Display a message when no budgets exist. */}
            {budgets.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="font-medium">
                    No budgets configured
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Create your first budget to start tracking cloud
                    spending limits.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Display all backend budgets. */}
            <div className="grid gap-4 xl:grid-cols-2">
              {budgets.map(
                (budget) => {
                  // Normalize the API monthly limit.
                  const monthlyLimit =
                    toNumber(
                      budget.monthly_limit,
                    );

                  // Use real current spending only for account-level budgets.
                  const currentSpend =
                    budget.scope_type ===
                    "account"
                      ? costQuery.data
                          ?.month_to_date ??
                        null
                      : null;

                  // Calculate utilization only when real scoped spending exists.
                  const utilization =
                    currentSpend !== null &&
                    monthlyLimit > 0
                      ? (currentSpend /
                          monthlyLimit) *
                        100
                      : null;

                  // Determine whether the account budget currently exceeds its limit.
                  const isExceeded =
                    utilization !==
                      null &&
                    utilization >= 100;

                  // Render one real backend budget.
                  return (
                    <Card
                      key={
                        budget.id
                      }
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {/* Display the budget name. */}
                            <CardTitle>
                              {
                                budget.name
                              }
                            </CardTitle>

                            {/* Display backend scope information. */}
                            <CardDescription className="mt-1 capitalize">
                              {
                                budget.scope_type
                              }
                              :{" "}
                              {
                                budget.scope_value
                              }
                            </CardDescription>
                          </div>

                          {/* Display edit and delete actions. */}
                          <div className="flex items-center gap-1">
                            {/* Open the selected budget for editing. */}
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Edit ${budget.name}`}
                              onClick={() =>
                                handleEdit(
                                  budget,
                                )
                              }
                            >
                              {/* Display edit icon. */}
                              <Pencil className="size-4" />
                            </Button>

                            {/* Delete the selected budget. */}
                            <Button
                              size="icon"
                              variant="ghost"
                              aria-label={`Delete ${budget.name}`}
                              disabled={
                                deleteBudget.isPending
                              }
                              onClick={() =>
                                void handleDelete(
                                  budget,
                                )
                              }
                            >
                              {/* Display delete icon. */}
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-5">
                        {/* Display budget state and current cost information. */}
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {/* Describe the cost value. */}
                            <p className="text-sm text-muted-foreground">
                              Current spend
                            </p>

                            {currentSpend !==
                            null ? (
                              // Display actual month-to-date account spending.
                              <p className="text-2xl font-semibold">
                                {formatCurrency(
                                  currentSpend,
                                )}
                              </p>
                            ) : (
                              // Do not manufacture scoped spending data.
                              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                                Scoped cost evaluation will be added with
                                detailed cost allocation.
                              </p>
                            )}
                          </div>

                          {/* Display backend activation state. */}
                          <Badge
                            variant={
                              isExceeded
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {isExceeded
                              ? "Limit exceeded"
                              : budget.is_active
                                ? "Active"
                                : "Inactive"}
                          </Badge>
                        </div>

                        {/* Show utilization only when genuine cost data exists. */}
                        {utilization !==
                          null && (
                          <div className="space-y-2">
                            {/* Display current account-budget utilization. */}
                            <Progress
                              value={Math.min(
                                utilization,
                                100,
                              )}
                            />

                            {/* Display utilization percentage. */}
                            <p className="text-xs text-muted-foreground">
                              {Math.round(
                                utilization,
                              )}
                              % of monthly limit used
                            </p>
                          </div>
                        )}

                        {/* Display persisted budget configuration. */}
                        <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
                          {/* Display monthly limit. */}
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Limit
                            </p>

                            <p className="mt-1 font-medium">
                              {formatCurrency(
                                monthlyLimit,
                              )}
                            </p>
                          </div>

                          {/* Display warning threshold. */}
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Warning
                            </p>

                            <p className="mt-1 font-medium">
                              {
                                budget.warning_threshold
                              }
                              %
                            </p>
                          </div>

                          {/* Display critical threshold. */}
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Critical
                            </p>

                            <p className="mt-1 font-medium">
                              {
                                budget.critical_threshold
                              }
                              %
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                },
              )}
            </div>
          </>
        )}

      {/* Connect the dialog to real create/update mutations. */}
      <BudgetDialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
        budget={
          selectedBudget
        }
        onSave={
          handleSave
        }
        isSaving={
          createBudget.isPending ||
          updateBudget.isPending
        }
      />
    </section>
  );
}
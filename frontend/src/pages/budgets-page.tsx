// Import page state.
import {
  useState,
} from "react";

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

// Import real account API.
import {
  useCloudAccounts,
} from "@/features/cloud-accounts/api/cloud-accounts-api";

// Import real budget APIs.
import {
  useBudgets,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/features/budgets/api/budgets-api";

// Import budget dialog.
import {
  BudgetDialog,
} from "@/features/budgets/budget-dialog";

import type {
  BudgetFormValues,
} from "@/features/budgets/budget-dialog";

// Import genuine cost records for service choices/currency.
import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

// Import reusable UI.
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
  Progress,
} from "@/components/ui/progress";

// Import API model.
import type {
  BudgetApiResponse,
} from "@/types/api";

// Import monetary helpers.
import {
  formatCurrency,
  toNumber,
} from "@/lib/formatters";


// Export the budget-management page.
export function BudgetsPage() {
  // Load genuine persisted budgets and backend evaluations.
  const budgetsQuery =
    useBudgets();

  // Load real connected cloud accounts for account scope selection.
  const accountsQuery =
    useCloudAccounts();

  // Load genuine service-level billing information.
  const costQuery =
    useCostSummary();

  // Create/update/delete mutations.
  const createBudget =
    useCreateBudget();

  const updateBudget =
    useUpdateBudget();

  const deleteBudget =
    useDeleteBudget();

  // Read backend budgets.
  const budgets =
    budgetsQuery.data ??
    [];

  // Read genuine connected accounts.
  const accounts =
    accountsQuery.data ??
    [];

  // Build genuine selectable AWS services from imported billing data.
  const services =
    Array.from(
      new Set(
        (
          costQuery.data
            ?.by_service ??
          []
        ).map(
          (
            service,
          ) =>
            service.service,
        ),
      ),
    ).sort();

  // Use the reporting currency returned by AWS data.
  const currency =
    costQuery.data
      ?.currency ??
    "USD";

  // Control create/edit dialog.
  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(
      false,
    );

  const [
    selectedBudget,
    setSelectedBudget,
  ] =
    useState<
      BudgetApiResponse | null
    >(
      null,
    );

  // Open creation mode.
  function handleCreate() {
    setSelectedBudget(
      null,
    );

    setDialogOpen(
      true,
    );
  }

  // Open edit mode.
  function handleEdit(
    budget:
      BudgetApiResponse,
  ) {
    setSelectedBudget(
      budget,
    );

    setDialogOpen(
      true,
    );
  }

  // Persist create/update through FastAPI.
  async function handleSave(
    values:
      BudgetFormValues,
  ) {
    try {
      if (
        selectedBudget
      ) {
        await updateBudget.mutateAsync({
          id:
            selectedBudget.id,
          name:
            values.name,
          monthly_limit:
            values.monthlyLimit,
          warning_threshold:
            values.warningThreshold,
          critical_threshold:
            values.criticalThreshold,
        });

        toast.success(
          "Budget updated.",
        );

        return;
      }

      await createBudget.mutateAsync({
        name:
          values.name,
        scope_type:
          values.scopeType,
        scope_value:
          values.scopeValue,
        monthly_limit:
          values.monthlyLimit,
        warning_threshold:
          values.warningThreshold,
        critical_threshold:
          values.criticalThreshold,
      });

      toast.success(
        "Budget created.",
      );
    } catch {
      toast.error(
        "Unable to save budget.",
      );

      throw new Error(
        "Budget save failed.",
      );
    }
  }

  // Delete a persisted budget.
  async function handleDelete(
    budget:
      BudgetApiResponse,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${budget.name}"?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteBudget.mutateAsync(
        budget.id,
      );

      toast.success(
        "Budget deleted.",
      );
    } catch {
      toast.error(
        "Unable to delete budget.",
      );
    }
  }

  // Calculate genuine summary information.
  const activeBudgetCount =
    budgets.filter(
      (
        budget,
      ) =>
        budget.is_active,
    ).length;

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

  // Resolve account UUIDs into friendly labels.
  function getScopeLabel(
    budget:
      BudgetApiResponse,
  ): string {
    if (
      budget.scope_type !==
      "account"
    ) {
      return budget.scope_value;
    }

    const account =
      accounts.find(
        (
          candidate,
        ) =>
          candidate.id ===
          budget.scope_value,
      );

    return account
      ? `${account.name} (${account.external_account_id})`
      : budget.scope_value;
  }

  // Render loading/error states for the primary budget API.
  if (
    budgetsQuery.isLoading
  ) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Loading budgets...
        </CardContent>
      </Card>
    );
  }

  if (
    budgetsQuery.isError
  ) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-destructive">
          Unable to load budgets.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            FinOps governance
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Budgets
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Define and evaluate monthly AWS account or service spending limits.
          </p>
        </div>

        <Button
          onClick={
            handleCreate
          }
          disabled={
            accounts.length ===
              0 &&
            services.length ===
              0
          }
        >
          <Plus className="mr-2 size-4" />
          Create budget
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
                currency,
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Supported scopes
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="font-medium">
              Account and service
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Evaluated from genuine AWS Cost Explorer records.
            </p>
          </CardContent>
        </Card>
      </div>

      {budgets.length ===
        0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="font-medium">
              No budgets configured
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Create an account or service budget to start tracking spending limits.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {budgets.map(
          (
            budget,
          ) => {
            // Use the evaluation calculated by FastAPI.
            const currentSpend =
              toNumber(
                budget.current_spend,
              );

            const utilization =
              toNumber(
                budget.utilization_percentage,
              );

            const evaluationStatus =
              budget.evaluation_status;

            const isUnsupported =
              evaluationStatus ===
              "unsupported";

            const badgeVariant =
              evaluationStatus ===
              "critical"
                ? "destructive"
                : evaluationStatus ===
                    "warning"
                  ? "secondary"
                  : "outline";

            return (
              <Card
                key={
                  budget.id
                }
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>
                        {
                          budget.name
                        }
                      </CardTitle>

                      <CardDescription className="mt-1">
                        <span className="capitalize">
                          {
                            budget.scope_type
                          }
                        </span>
                        {": "}
                        {
                          getScopeLabel(
                            budget,
                          )
                        }
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-1">
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
                        <Pencil className="size-4" />
                      </Button>

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
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Current spend
                      </p>

                      <p className="mt-1 text-2xl font-semibold">
                        {formatCurrency(
                          currentSpend,
                          currency,
                        )}
                      </p>
                    </div>

                    <Badge
                      variant={
                        badgeVariant
                      }
                      className="capitalize"
                    >
                      {
                        evaluationStatus
                      }
                    </Badge>
                  </div>

                  {!isUnsupported && (
                    <div className="space-y-2">
                      <Progress
                        value={Math.min(
                          Math.max(
                            utilization,
                            0,
                          ),
                          100,
                        )}
                      />

                      <p className="text-xs text-muted-foreground">
                        {utilization.toFixed(
                          1,
                        )}
                        % of monthly limit used
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 rounded-lg border p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Limit
                      </p>

                      <p className="mt-1 font-medium">
                        {formatCurrency(
                          toNumber(
                            budget.monthly_limit,
                          ),
                          currency,
                        )}
                      </p>
                    </div>

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

                  <p className="text-xs text-muted-foreground">
                    {
                      budget.last_evaluated_at
                        ? `Last evaluated ${new Date(
                            budget.last_evaluated_at,
                          ).toLocaleString()}`
                        : "Not yet evaluated"
                    }
                  </p>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      <BudgetDialog
        key={`${selectedBudget?.id ?? "new"}-${dialogOpen}`}
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
        accounts={
          accounts
        }
        services={
          services
        }
      />
    </section>
  );
}

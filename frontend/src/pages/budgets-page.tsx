// Import React state management.
import { useState } from "react";

// Import page icons.
import {
  Pencil,
  Plus,
} from "lucide-react";

// Import the budget dialog.
import { BudgetDialog } from "@/features/budgets/budget-dialog";

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

// Import demonstration budgets.
import { mockBudgets } from "@/mocks/budgets";

// Import the budget type.
import type { Budget } from "@/types/budget";

// Format currency consistently.
function formatCurrency(value: number): string {
  // Return localized euro currency.
  return new Intl.NumberFormat(
    "de-DE",
    {
      style: "currency",
      currency: "EUR",
    },
  ).format(value);
}

// Export the budget-management screen.
export function BudgetsPage() {
  // Store budgets locally until the backend exists.
  const [budgets, setBudgets] =
    useState<Budget[]>(mockBudgets);

  // Control the create/edit dialog.
  const [dialogOpen, setDialogOpen] =
    useState(false);

  // Store the budget currently being edited.
  const [selectedBudget, setSelectedBudget] =
    useState<Budget | null>(null);

  // Open the dialog for a new budget.
  function handleCreate() {
    // Ensure no existing budget is selected.
    setSelectedBudget(null);

    // Open the dialog.
    setDialogOpen(true);
  }

  // Open the dialog for editing.
  function handleEdit(budget: Budget) {
    // Store the selected budget.
    setSelectedBudget(budget);

    // Open the dialog.
    setDialogOpen(true);
  }

  // Add or update one budget.
  function handleSave(budget: Budget) {
    // Update the local demonstration dataset.
    setBudgets((currentBudgets) => {
      // Check whether this budget already exists.
      const exists =
        currentBudgets.some(
          (item) =>
            item.id === budget.id,
        );

      // Replace the existing budget when editing.
      if (exists) {
        return currentBudgets.map(
          (item) =>
            item.id === budget.id
              ? budget
              : item,
        );
      }

      // Append a newly created budget.
      return [
        ...currentBudgets,
        budget,
      ];
    });
  }

  // Render the budget-management page.
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
            Define spending limits for accounts, services, environments,
            and teams.
          </p>
        </div>

        <Button onClick={handleCreate}>
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
              {budgets.length}
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
                budgets.reduce(
                  (total, budget) =>
                    total +
                    budget.monthlyLimit,
                  0,
                ),
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              Forecasted violations
            </CardDescription>
          </CardHeader>

          <CardContent>
            <p className="text-2xl font-semibold">
              {
                budgets.filter(
                  (budget) =>
                    budget.status ===
                    "forecast-exceeded",
                ).length
              }
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {budgets.map((budget) => {
          // Calculate actual budget utilization.
          const utilization =
            (budget.currentSpend /
              budget.monthlyLimit) *
            100;

          // Render one budget card.
          return (
            <Card key={budget.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>
                      {budget.name}
                    </CardTitle>

                    <CardDescription className="mt-1 capitalize">
                      {budget.scopeType}:{" "}
                      {budget.scopeValue}
                    </CardDescription>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Edit ${budget.name}`}
                    onClick={() =>
                      handleEdit(budget)
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current spend
                    </p>

                    <p className="text-2xl font-semibold">
                      {formatCurrency(
                        budget.currentSpend,
                      )}
                    </p>
                  </div>

                  <Badge
                    variant={
                      budget.status ===
                      "forecast-exceeded"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {budget.status}
                  </Badge>
                </div>

                <Progress
                  value={Math.min(
                    utilization,
                    100,
                  )}
                />

                <div className="grid grid-cols-2 gap-4 rounded-lg border p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Limit
                    </p>

                    <p className="mt-1 font-medium">
                      {formatCurrency(
                        budget.monthlyLimit,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground">
                      Forecast
                    </p>

                    <p className="mt-1 font-medium">
                      {formatCurrency(
                        budget.forecastSpend,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={selectedBudget}
        onSave={handleSave}
      />
    </section>
  );
}
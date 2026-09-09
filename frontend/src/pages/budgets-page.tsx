// Import page state.
import {
  useState,
} from "react";

// Import budget governance icons.
import {
  AlertTriangle,
  CircleCheckBig,
  CircleDollarSign,
  Gauge,
  Pencil,
  Plus,
  ShieldAlert,
  Target,
  Trash2,
  WalletCards,
} from "lucide-react";

// Import notifications.
import {
  toast,
} from "sonner";

// Import reusable API states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import reusable UI.
import {
  Badge,
} from "@/components/ui/badge";

import {
  Button,
} from "@/components/ui/button";

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

// Import budget editor.
import {
  BudgetDialog,
} from "@/features/budgets/budget-dialog";

import type {
  BudgetFormValues,
} from "@/features/budgets/budget-dialog";

// Import genuine billing information.
import {
  useCostSummary,
} from "@/features/costs/api/costs-api";

// Import formatting helpers.
import {
  formatBillingAmount,
  formatCurrency,
  formatTimestamp,
  toNumber,
} from "@/lib/formatters";

// Import genuine backend budget model.
import type {
  BudgetApiResponse,
} from "@/types/api";


// Export the FinOps budget governance workspace.
export function BudgetsPage() {
  // Load persisted budgets and their backend evaluations.
  const budgetsQuery =
    useBudgets();

  // Load genuine connected AWS accounts.
  const accountsQuery =
    useCloudAccounts();

  // Load genuine billing service choices and reporting currency.
  const costQuery =
    useCostSummary();

  // Initialize CRUD mutations.
  const createBudget =
    useCreateBudget();

  const updateBudget =
    useUpdateBudget();

  const deleteBudget =
    useDeleteBudget();

  // Control create/edit dialog visibility.
  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  // Store the budget currently being edited.
  const [
    selectedBudget,
    setSelectedBudget,
  ] =
    useState<
      BudgetApiResponse | null
    >(null);

  // Render a unified loading state while required budget context loads.
  if (
    budgetsQuery.isPending ||
    accountsQuery.isPending ||
    costQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render a recoverable failure when any required source is unavailable.
  if (
    budgetsQuery.isError ||
    accountsQuery.isError ||
    costQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load budgets"
        description="Budget, AWS account or billing context could not be retrieved."
        onRetry={() => {
          void budgetsQuery.refetch();
          void accountsQuery.refetch();
          void costQuery.refetch();
        }}
      />
    );
  }

  // Store successful backend data.
  const budgets =
    budgetsQuery.data;

  const accounts =
    accountsQuery.data;

  const costs =
    costQuery.data;

  // Build genuine service-scope choices from synchronized AWS billing.
  const services =
    Array.from(
      new Set(
        costs.by_service.map(
          (
            service,
          ) =>
            service.service,
        ),
      ),
    ).sort();

  // Use AWS reporting currency.
  const currency =
    costs.currency;

  // Determine whether any valid creation scope currently exists.
  const canCreateBudget =
    accounts.length >
      0 ||
    services.length >
      0;

  // Open budget creation mode.
  function handleCreate() {
    setSelectedBudget(
      null,
    );

    setDialogOpen(
      true,
    );
  }

  // Open budget edit mode.
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

  // Persist create/update through the real API.
  async function handleSave(
    values:
      BudgetFormValues,
  ) {
    try {
      // Update only fields supported by the existing backend contract.
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

      // Create one genuine persisted budget.
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

      // Preserve the dialog's existing failure handling.
      throw new Error(
        "Budget save failed.",
      );
    }
  }

  // Delete one persisted budget after explicit confirmation.
  async function handleDelete(
    budget:
      BudgetApiResponse,
  ) {
    // Keep the existing intentional destructive confirmation.
    const confirmed =
      window.confirm(
        `Delete "${budget.name}"?`,
      );

    if (
      !confirmed
    ) {
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

  // Count active budgets only from persisted backend state.
  const activeBudgets =
    budgets.filter(
      (
        budget,
      ) =>
        budget.is_active,
    );

  // Count genuine backend evaluation states.
  const criticalBudgetCount =
    budgets.filter(
      (
        budget,
      ) =>
        budget.evaluation_status ===
        "critical",
    ).length;

  const warningBudgetCount =
    budgets.filter(
      (
        budget,
      ) =>
        budget.evaluation_status ===
        "warning",
    ).length;

  const unsupportedBudgetCount =
    budgets.filter(
      (
        budget,
      ) =>
        budget.evaluation_status ===
        "unsupported",
    ).length;

  // Sum only active configured limits for actionable governance context.
  const activeConfiguredLimit =
    activeBudgets.reduce(
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

  // Resolve account UUIDs into human-readable AWS account labels.
  function getScopeLabel(
    budget:
      BudgetApiResponse,
  ): string {
    // Service scopes are already provider-visible names.
    if (
      budget.scope_type !==
      "account"
    ) {
      return budget.scope_value;
    }

    // Resolve account-scoped UUID through genuine account data.
    const account =
      accounts.find(
        (
          candidate,
        ) =>
          candidate.id ===
          budget.scope_value,
      );

    // Preserve UUID when the supporting account is no longer returned.
    return account
      ? `${account.name} (${account.external_account_id})`
      : budget.scope_value;
  }

  // Derive overall governance posture strictly from backend evaluations.
  const governancePosture =
    criticalBudgetCount >
    0
      ? {
          label:
            "Action required",

          description:
            `${criticalBudgetCount} budget evaluation${
              criticalBudgetCount ===
              1
                ? ""
                : "s"
            } reached critical status.`,

          classes:
            "border-rose-400/20 bg-rose-400/8 text-rose-300",

          Icon:
            ShieldAlert,
        }
      : warningBudgetCount >
          0
        ? {
            label:
              "Watch",

            description:
              `${warningBudgetCount} budget evaluation${
                warningBudgetCount ===
                1
                  ? ""
                  : "s"
              } reached warning status.`,

            classes:
              "border-amber-400/20 bg-amber-400/8 text-amber-300",

            Icon:
              AlertTriangle,
          }
        : budgets.length ===
            0
          ? {
              label:
                "No budgets configured",

              description:
                "Create an account or service budget to begin spend governance.",

              classes:
                "border-sky-400/20 bg-sky-400/8 text-sky-300",

              Icon:
                WalletCards,
            }
          : unsupportedBudgetCount >
              0
            ? {
                label:
                  "Partial evaluation coverage",

                description:
                  `${unsupportedBudgetCount} budget${
                    unsupportedBudgetCount ===
                    1
                      ? ""
                      : "s"
                  } cannot currently be evaluated from available billing data.`,

                classes:
                  "border-violet-400/20 bg-violet-400/8 text-violet-300",

                Icon:
                  Gauge,
              }
            : {
                label:
                  "Within configured thresholds",

                description:
                  "No budget evaluation is currently in warning or critical status.",

                classes:
                  "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

                Icon:
                  CircleCheckBig,
              };

  // Read posture icon.
  const GovernanceIcon =
    governancePosture.Icon;

  // Define genuine budget-governance KPI tiles.
  const metrics = [
    {
      label:
        "Configured budgets",

      value:
        String(
          budgets.length,
        ),

      helper:
        `${activeBudgets.length} active`,

      Icon:
        WalletCards,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Active monthly limit",

      value:
        formatCurrency(
          activeConfiguredLimit,
          currency,
        ),

      helper:
        "Combined active limits",

      Icon:
        CircleDollarSign,

      iconClass:
        activeBudgets.length > 0
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        activeBudgets.length > 0
          ? "from-emerald-400/14 via-transparent to-transparent"
          : "from-cyan-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Warning evaluations",

      value:
        String(
          warningBudgetCount,
        ),

      helper:
        "Backend-calculated status",

      Icon:
        AlertTriangle,

      iconClass:
        "border-amber-400/20 bg-amber-400/10 text-amber-300",

      glowClass:
        "from-amber-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Critical evaluations",

      value:
        String(
          criticalBudgetCount,
        ),

      helper:
        "Requires attention",

      Icon:
        ShieldAlert,

      iconClass:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      glowClass:
        "from-rose-400/14 via-transparent to-transparent",
    },
  ];

  // Map backend evaluation state into visual semantics.
  function getEvaluationStyle(
    status: string,
  ) {
    // Critical evaluations require highest emphasis.
    if (
      status ===
      "critical"
    ) {
      return {
        badge:
          "border-rose-400/20 bg-rose-400/10 text-rose-300",

        progress:
          "[&_[data-slot=progress-indicator]]:bg-rose-400",
      };
    }

    // Warning evaluations use amber semantics.
    if (
      status ===
      "warning"
    ) {
      return {
        badge:
          "border-amber-400/20 bg-amber-400/10 text-amber-300",

        progress:
          "[&_[data-slot=progress-indicator]]:bg-amber-400",
      };
    }

    // Unsupported evaluation is informational rather than healthy.
    if (
      status ===
      "unsupported"
    ) {
      return {
        badge:
          "border-violet-400/20 bg-violet-400/10 text-violet-300",

        progress:
          "[&_[data-slot=progress-indicator]]:bg-violet-400",
      };
    }

    // Healthy evaluation uses green semantics.
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",

      progress:
        "[&_[data-slot=progress-indicator]]:bg-emerald-400",
    };
  }

  // Render the FinOps budget control center.
  return (
    <section className="space-y-6">
      {/* =====================================================
          Governance hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Cyan governance atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Violet secondary depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-40 size-[400px] rounded-full bg-violet-500/9 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/65 to-transparent"
        />

        <CardContent className="relative grid gap-7 p-6 lg:grid-cols-[1.3fr_0.7fr] lg:p-7">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">
              <Target className="size-3.5" />

              FinOps governance
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Control AWS spending with
              evaluated budget guardrails.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Define account or service spending limits and monitor
              backend-calculated utilization against warning and critical
              thresholds.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                className="rounded-xl border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted/25 disabled:text-muted-foreground disabled:opacity-60"
                disabled={
                  !canCreateBudget
                }
                onClick={
                  handleCreate
                }
              >
                <Plus className="mr-2 size-4" />

                Create budget
              </Button>

              {!canCreateBudget && (
                <p className="text-xs text-muted-foreground">
                  Connect an AWS account or synchronize billed services
                  before creating a budget.
                </p>
              )}
            </div>
          </div>

          {/* Real overall governance posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Governance posture
            </p>

            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border p-3.5 ${governancePosture.classes}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5">
                <GovernanceIcon className="size-[18px]" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {
                    governancePosture.label
                  }
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {
                    governancePosture.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Active budgets
                </span>

                <span className="text-sm font-semibold">
                  {
                    activeBudgets.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Active monthly limit
                </span>

                <span className="text-sm font-semibold">
                  {formatCurrency(
                    activeConfiguredLimit,
                    currency,
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Unsupported evaluations
                </span>

                <span className="text-sm font-semibold">
                  {
                    unsupportedBudgetCount
                  }
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Budget governance KPI strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          (
            metric,
          ) => {
            // Read configured icon.
            const Icon =
              metric.Icon;

            return (
              <Card
                className="group relative min-h-[150px] overflow-hidden bg-card/72 py-0"
                key={
                  metric.label
                }
              >
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70 ${metric.glowClass}`}
                />

                <CardContent className="relative flex h-full flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      {
                        metric.label
                      }
                    </p>

                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-300 group-hover:scale-110 ${metric.iconClass}`}
                    >
                      <Icon className="size-[18px]" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <p className="truncate text-2xl font-semibold tracking-[-0.035em]">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {
                        metric.helper
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* =====================================================
          Empty governance state
          ===================================================== */}
      {budgets.length ===
        0 && (
        <Card className="bg-card/72">
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center text-center">
            <div className="flex size-13 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
              <WalletCards className="size-5" />
            </div>

            <p className="mt-4 font-semibold">
              No budgets configured
            </p>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Create an account or service budget to begin evaluating
              synchronized AWS spending against explicit governance thresholds.
            </p>

            <Button
              className="mt-5 rounded-xl disabled:cursor-not-allowed disabled:bg-muted/40 disabled:text-muted-foreground disabled:opacity-60"
              disabled={
                !canCreateBudget
              }
              onClick={
                handleCreate
              }
            >
              <Plus className="mr-2 size-4" />

              Create first budget
            </Button>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          Persisted budget cards
          ===================================================== */}
      <div className="grid gap-5 xl:grid-cols-2">
        {budgets.map(
          (
            budget,
          ) => {
            // Read backend-calculated spend/utilization.
            const currentSpend =
              toNumber(
                budget.current_spend,
              );

            const utilization =
              toNumber(
                budget.utilization_percentage,
              );

            const monthlyLimit =
              toNumber(
                budget.monthly_limit,
              );

            const evaluationStatus =
              budget.evaluation_status;

            const isUnsupported =
              evaluationStatus ===
              "unsupported";

            // Clamp only visual progress width.
            const visualUtilization =
              Math.min(
                Math.max(
                  utilization,
                  0,
                ),
                100,
              );

            // Calculate remaining amount from genuine values.
            const remaining =
              Math.max(
                monthlyLimit -
                  currentSpend,
                0,
              );

            // Read semantic styles.
            const evaluationStyle =
              getEvaluationStyle(
                evaluationStatus,
              );

            // Render one persisted budget control card.
            return (
              <Card
                className="group overflow-hidden bg-card/72 py-0"
                key={
                  budget.id
                }
              >
                <CardHeader className="border-b border-border/50 p-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate">
                          {
                            budget.name
                          }
                        </CardTitle>

                        {!budget.is_active && (
                          <Badge
                            className="border-border/70 bg-muted/35 text-muted-foreground"
                            variant="outline"
                          >
                            Inactive
                          </Badge>
                        )}
                      </div>

                      <CardDescription className="mt-1 break-words">
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

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        aria-label={`Edit ${budget.name}`}
                        className="rounded-xl"
                        onClick={() =>
                          handleEdit(
                            budget,
                          )
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        aria-label={`Delete ${budget.name}`}
                        className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        disabled={
                          deleteBudget.isPending
                        }
                        onClick={() =>
                          void handleDelete(
                            budget,
                          )
                        }
                        size="icon"
                        variant="ghost"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-4">
                  {/* Current evaluation state. */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                        Current spend
                      </p>

                      <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
                        {formatBillingAmount(
                          currentSpend,
                          currency,
                        )}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.11em] ${evaluationStyle.badge}`}
                    >
                      {
                        evaluationStatus
                      }
                    </span>
                  </div>

                  {/* Backend utilization bar only when evaluation is supported. */}
                  {!isUnsupported ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Budget utilization
                        </p>

                        <p className="text-xs font-semibold">
                          {utilization.toFixed(
                            1,
                          )}
                          %
                        </p>
                      </div>

                      <Progress
                        className={
                          evaluationStyle.progress
                        }
                        value={
                          visualUtilization
                        }
                      />

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>
                          {formatCurrency(
                            remaining,
                            currency,
                          )}
                          {" "}
                          remaining
                        </span>

                        <span>
                          Limit{" "}
                          {formatCurrency(
                            monthlyLimit,
                            currency,
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.045] p-3">
                      <p className="text-sm font-semibold text-violet-300">
                        Evaluation unavailable
                      </p>

                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        The backend cannot currently evaluate this budget
                        from the synchronized billing data available for
                        its scope.
                      </p>
                    </div>
                  )}

                  {/* Governance thresholds. */}
                  <div className="grid gap-3 rounded-xl border border-border/55 bg-background/20 p-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Monthly limit
                      </p>

                      <p className="mt-1.5 text-sm font-semibold">
                        {formatCurrency(
                          monthlyLimit,
                          currency,
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Warning
                      </p>

                      <p className="mt-1.5 text-sm font-semibold text-amber-300">
                        {
                          budget.warning_threshold
                        }
                        %
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Critical
                      </p>

                      <p className="mt-1.5 text-sm font-semibold text-rose-300">
                        {
                          budget.critical_threshold
                        }
                        %
                      </p>
                    </div>
                  </div>

                  {/* Backend evaluation freshness. */}
                  <div className="flex items-center justify-between gap-3 border-t border-border/45 pt-3">
                    <span className="text-xs text-muted-foreground">
                      Last evaluation
                    </span>

                    <span className="text-right text-xs font-medium">
                      {budget.last_evaluated_at
                        ? formatTimestamp(
                            budget.last_evaluated_at,
                          )
                        : "Not yet evaluated"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* Preserve the existing genuine create/edit workflow. */}
      <BudgetDialog
        accounts={
          accounts
        }
        budget={
          selectedBudget
        }
        isSaving={
          createBudget.isPending ||
          updateBudget.isPending
        }
        key={`${selectedBudget?.id ?? "new"}-${dialogOpen}`}
        onOpenChange={
          setDialogOpen
        }
        onSave={
          handleSave
        }
        open={
          dialogOpen
        }
        services={
          services
        }
      />
    </section>
  );
}

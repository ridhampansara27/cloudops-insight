// Import React form/state helpers.
import {
  type FormEvent,
  useState,
} from "react";

// Import dialog presentation icons.
import {
  CircleDollarSign,
  Gauge,
  Target,
  WalletCards,
} from "lucide-react";

// Import reusable controls.
import {
  Button,
} from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Input,
} from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import genuine API models.
import type {
  BudgetApiResponse,
  CloudAccountApiResponse,
} from "@/types/api";

// Import supported budget scope type.
import type {
  BudgetScopeType,
} from "@/types/budget";


// Define normalized values returned to the page.
export interface BudgetFormValues {
  name: string;

  scopeType:
    BudgetScopeType;

  scopeValue: string;

  monthlyLimit: number;

  warningThreshold: number;

  criticalThreshold: number;
}


// Define dialog properties.
interface BudgetDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  budget?:
    | BudgetApiResponse
    | null;

  onSave: (
    values:
      BudgetFormValues,
  ) => Promise<void>;

  isSaving?: boolean;

  // Genuine connected AWS accounts.
  accounts:
    CloudAccountApiResponse[];

  // Genuine billed AWS services.
  services:
    string[];
}


// Normalize historical scope values safely.
function normalizeScopeType(
  value:
    | string
    | undefined,
): BudgetScopeType {
  return value ===
    "service"
      ? "service"
      : "account";
}


// Export the create/edit budget dialog.
export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  onSave,
  isSaving = false,
  accounts,
  services,
}: BudgetDialogProps) {
  // Store currently selected scope for creation mode.
  const [
    scopeType,
    setScopeType,
  ] =
    useState<BudgetScopeType>(
      normalizeScopeType(
        budget?.scope_type,
      ),
    );

  // Store visible validation/API error.
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  // Existing budget scope is intentionally immutable during editing.
  const effectiveScopeType =
    budget
      ? normalizeScopeType(
          budget.scope_type,
        )
      : scopeType;

  // Build scope choices only from genuine backend context.
  const scopeOptions =
    effectiveScopeType ===
    "account"
      ? accounts.map(
          (
            account,
          ) => ({
            value:
              account.id,

            label:
              `${account.name} (${account.external_account_id})`,
          }),
        )
      : services.map(
          (
            service,
          ) => ({
            value:
              service,

            label:
              service,
          }),
        );

  // Preserve historical scope values no longer returned by supporting APIs.
  const options =
    budget &&
    !scopeOptions.some(
      (
        option,
      ) =>
        option.value ===
        budget.scope_value,
    )
      ? [
          {
            value:
              budget.scope_value,

            label:
              budget.scope_value,
          },
          ...scopeOptions,
        ]
      : scopeOptions;

  // Select a real supporting option by default.
  const defaultScopeValue =
    budget?.scope_value ??
    options[
      0
    ]?.value ??
    "";

  // Handle validated form submission.
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    // Prevent native page submission.
    event.preventDefault();

    // Ignore duplicate submission while API mutation is active.
    if (
      isSaving
    ) {
      return;
    }

    // Clear previous error.
    setFormError(
      null,
    );

    // Read submitted form values.
    const formData =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        formData.get(
          "name",
        ) ??
        "",
      ).trim();

    // Disabled edit fields are absent from FormData.
    const submittedScopeType =
      budget
        ? normalizeScopeType(
            budget.scope_type,
          )
        : (
            String(
              formData.get(
                "scopeType",
              ) ??
              "account",
            ) as BudgetScopeType
          );

    // Preserve immutable existing scope during editing.
    const scopeValue =
      (
        budget?.scope_value ??
        String(
          formData.get(
            "scopeValue",
          ) ??
          "",
        )
      ).trim();

    const monthlyLimit =
      Number(
        formData.get(
          "monthlyLimit",
        ),
      );

    const warningThreshold =
      Number(
        formData.get(
          "warningThreshold",
        ),
      );

    const criticalThreshold =
      Number(
        formData.get(
          "criticalThreshold",
        ),
      );

    // Validate required identity/scope values.
    if (
      name.length ===
        0 ||
      scopeValue.length ===
        0
    ) {
      setFormError(
        "Choose a valid budget scope and enter a budget name.",
      );

      return;
    }

    // Validate monthly monetary limit.
    if (
      !Number.isFinite(
        monthlyLimit,
      ) ||
      monthlyLimit <=
        0
    ) {
      setFormError(
        "Monthly limit must be greater than zero.",
      );

      return;
    }

    // Validate threshold ranges.
    if (
      !Number.isFinite(
        warningThreshold,
      ) ||
      warningThreshold <
        1 ||
      warningThreshold >
        100 ||
      !Number.isFinite(
        criticalThreshold,
      ) ||
      criticalThreshold <
        1 ||
      criticalThreshold >
        100
    ) {
      setFormError(
        "Warning and critical thresholds must be between 1% and 100%.",
      );

      return;
    }

    // Critical threshold must not precede warning threshold.
    if (
      criticalThreshold <
      warningThreshold
    ) {
      setFormError(
        "Critical threshold must be greater than or equal to warning threshold.",
      );

      return;
    }

    try {
      // Persist through the existing API-backed callback.
      await onSave({
        name,

        scopeType:
          submittedScopeType,

        scopeValue,

        monthlyLimit,

        warningThreshold,

        criticalThreshold,
      });

      // Close only after persistence succeeds.
      onOpenChange(
        false,
      );
    } catch {
      // Keep the dialog open after failure.
      setFormError(
        "CloudOps could not save this budget. Review the values and try again.",
      );
    }
  }

  // Render the premium governance editor.
  return (
    <Dialog
      onOpenChange={
        onOpenChange
      }
      open={
        open
      }
    >
      <DialogContent className="overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-2xl">
        {/* Add restrained FinOps atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-64 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-violet-500/8 blur-3xl"
        />

        <DialogHeader className="relative border-b border-border/50 px-6 py-5 text-left">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
              <WalletCards className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                {budget
                  ? "Edit budget"
                  : "Create budget"}
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                Configure a monthly AWS spending limit using a scope
                CloudOps can evaluate from synchronized billing records.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="relative"
          key={`${budget?.id ?? "new"}-${open}`}
          onSubmit={
            handleSubmit
          }
        >
          <div className="space-y-5 px-6 py-5">
            {/* Budget identity. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Target className="size-4 text-primary" />

                <p className="text-sm font-semibold">
                  Budget identity
                </p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="budget-name"
                >
                  Budget name
                </label>

                <Input
                  className="rounded-xl bg-background/30"
                  defaultValue={
                    budget?.name ??
                    ""
                  }
                  disabled={
                    isSaving
                  }
                  id="budget-name"
                  name="name"
                  placeholder="AWS monthly budget"
                  required
                />
              </div>
            </div>

            {/* Evaluation scope. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <Gauge className="size-4 text-violet-300" />

                <p className="text-sm font-semibold">
                  Evaluation scope
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="budget-scope-type"
                  >
                    Scope type
                  </label>

                  <NativeSelect
                    disabled={
                      Boolean(
                        budget,
                      ) ||
                      isSaving
                    }
                    id="budget-scope-type"
                    name="scopeType"
                    onChange={(
                      event,
                    ) =>
                      setScopeType(
                        event.target
                          .value as BudgetScopeType,
                      )
                    }
                    value={
                      effectiveScopeType
                    }
                  >
                    <NativeSelectOption value="account">
                      AWS account
                    </NativeSelectOption>

                    <NativeSelectOption value="service">
                      AWS service
                    </NativeSelectOption>
                  </NativeSelect>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="budget-scope-value"
                  >
                    {effectiveScopeType ===
                    "account"
                      ? "Connected account"
                      : "AWS service"}
                  </label>

                  <NativeSelect
                    defaultValue={
                      defaultScopeValue
                    }
                    disabled={
                      Boolean(
                        budget,
                      ) ||
                      isSaving
                    }
                    id="budget-scope-value"
                    key={`${effectiveScopeType}-${budget?.id ?? "new"}`}
                    name="scopeValue"
                    required
                  >
                    {options.length ===
                    0 ? (
                      <NativeSelectOption value="">
                        {effectiveScopeType ===
                        "account"
                          ? "No connected AWS accounts"
                          : "No billed AWS services available"}
                      </NativeSelectOption>
                    ) : (
                      options.map(
                        (
                          option,
                        ) => (
                          <NativeSelectOption
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </NativeSelectOption>
                        ),
                      )
                    )}
                  </NativeSelect>
                </div>
              </div>

              {budget && (
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  Budget scope is fixed after creation. Limits and
                  thresholds can still be edited.
                </p>
              )}
            </div>

            {/* Monetary control + alert thresholds. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="mb-4 flex items-center gap-2">
                <CircleDollarSign className="size-4 text-emerald-300" />

                <p className="text-sm font-semibold">
                  Monthly guardrails
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="budget-limit"
                  >
                    Monthly limit
                  </label>

                  <Input
                    className="rounded-xl bg-background/30"
                    defaultValue={
                      budget?.monthly_limit ??
                      100
                    }
                    disabled={
                      isSaving
                    }
                    id="budget-limit"
                    min="0.01"
                    name="monthlyLimit"
                    required
                    step="0.01"
                    type="number"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-amber-300"
                    htmlFor="warning-threshold"
                  >
                    Warning %
                  </label>

                  <Input
                    className="rounded-xl border-amber-400/15 bg-background/30"
                    defaultValue={
                      budget?.warning_threshold ??
                      80
                    }
                    disabled={
                      isSaving
                    }
                    id="warning-threshold"
                    max="100"
                    min="1"
                    name="warningThreshold"
                    required
                    type="number"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-rose-300"
                    htmlFor="critical-threshold"
                  >
                    Critical %
                  </label>

                  <Input
                    className="rounded-xl border-rose-400/15 bg-background/30"
                    defaultValue={
                      budget?.critical_threshold ??
                      100
                    }
                    disabled={
                      isSaving
                    }
                    id="critical-threshold"
                    max="100"
                    min="1"
                    name="criticalThreshold"
                    required
                    type="number"
                  />
                </div>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {
                  formError
                }
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 bg-background/20 px-6 py-4">
            <Button
              className="rounded-xl"
              disabled={
                isSaving
              }
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              type="button"
              variant="outline"
            >
              Cancel
            </Button>

            <Button
              className="rounded-xl"
              disabled={
                isSaving ||
                (
                  !budget &&
                  options.length ===
                    0
                )
              }
              type="submit"
            >
              {isSaving
                ? "Saving..."
                : budget
                  ? "Save changes"
                  : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

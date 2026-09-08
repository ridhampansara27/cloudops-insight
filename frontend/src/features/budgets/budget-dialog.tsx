// Import React form/state helpers.
import {
  type FormEvent,
  useState,
} from "react";

// Import reusable UI controls.
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

// Import genuine API models.
import type {
  BudgetApiResponse,
  CloudAccountApiResponse,
} from "@/types/api";

// Import the supported budget-scope type.
import type {
  BudgetScopeType,
} from "@/types/budget";


// Define normalized values returned to the page.
export interface BudgetFormValues {
  name: string;
  scopeType: BudgetScopeType;
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
    values: BudgetFormValues,
  ) => Promise<void>;
  isSaving?: boolean;

  // Supply genuine connected AWS accounts.
  accounts:
    CloudAccountApiResponse[];

  // Supply genuine AWS services discovered from billing records.
  services:
    string[];
}


// Normalize historical scope values safely.
function normalizeScopeType(
  value:
    | string
    | undefined,
): BudgetScopeType {
  return value === "service"
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
  // Store the currently selected supported scope.
  const [
    scopeType,
    setScopeType,
  ] =
    useState<BudgetScopeType>(
      normalizeScopeType(
        budget?.scope_type,
      ),
    );

  // Display validation/API errors inside the form.
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  // Build genuine scope choices.
  const effectiveScopeType =
    budget
      ? normalizeScopeType(
          budget.scope_type,
        )
      : scopeType;

  const scopeOptions =
    effectiveScopeType ===
    "account"
      ? accounts.map(
          (account) => ({
            value:
              account.id,
            label:
              `${account.name} (${account.external_account_id})`,
          }),
        )
      : services.map(
          (service) => ({
            value:
              service,
            label:
              service,
          }),
        );

  // Preserve an existing scope if it is not currently returned
  // by the supporting API.
  const options =
    budget &&
    !scopeOptions.some(
      (option) =>
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

  // Select a real default instead of asking the user for an
  // internal CloudOps UUID.
  const defaultScopeValue =
    budget?.scope_value ??
    options[0]?.value ??
    "";

  // Handle form submission.
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setFormError(
      null,
    );

    const formData =
      new FormData(
        event.currentTarget,
      );

    const name =
      String(
        formData.get(
          "name",
        ) ?? "",
      ).trim();

    // Disabled edit fields are absent from FormData,
    // so preserve their persisted values.
    const submittedScopeType =
      budget
        ? normalizeScopeType(
            budget.scope_type,
          )
        : (String(
            formData.get(
              "scopeType",
            ) ??
              "account",
          ) as BudgetScopeType);

    const scopeValue =
      (
        budget?.scope_value ??
        String(
          formData.get(
            "scopeValue",
          ) ?? "",
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

    // Validate required selections.
    if (
      name.length === 0 ||
      scopeValue.length === 0
    ) {
      setFormError(
        "Choose a valid budget scope and enter a budget name.",
      );

      return;
    }

    // Validate monetary limit.
    if (
      !Number.isFinite(
        monthlyLimit,
      ) ||
      monthlyLimit <= 0
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

    // Critical threshold cannot precede warning.
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
      await onSave({
        name,
        scopeType:
          submittedScopeType,
        scopeValue,
        monthlyLimit,
        warningThreshold,
        criticalThreshold,
      });

      // Close only after the API succeeds.
      onOpenChange(
        false,
      );
    } catch {
      setFormError(
        "CloudOps could not save this budget. Review the values and try again.",
      );
    }
  }

  return (
    <Dialog
      open={
        open
      }
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {
              budget
                ? "Edit budget"
                : "Create budget"
            }
          </DialogTitle>

          <DialogDescription>
            Configure a monthly AWS spending limit using a scope CloudOps can evaluate.
          </DialogDescription>
        </DialogHeader>

        <form
          key={`${budget?.id ?? "new"}-${open}`}
          onSubmit={
            handleSubmit
          }
        >
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="budget-name"
              >
                Budget name
              </label>

              <Input
                id="budget-name"
                name="name"
                defaultValue={
                  budget?.name ??
                  ""
                }
                placeholder="AWS monthly budget"
                required
                disabled={
                  isSaving
                }
              />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="budget-scope-type"
              >
                Scope
              </label>

              <NativeSelect
                id="budget-scope-type"
                name="scopeType"
                value={
                  effectiveScopeType
                }
                onChange={(
                  event,
                ) =>
                  setScopeType(
                    event.target
                      .value as BudgetScopeType,
                  )
                }
                disabled={
                  Boolean(
                    budget,
                  ) ||
                  isSaving
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
                className="text-sm font-medium"
                htmlFor="budget-scope-value"
              >
                {
                  effectiveScopeType ===
                  "account"
                    ? "Connected account"
                    : "AWS service"
                }
              </label>

              <NativeSelect
                key={`${effectiveScopeType}-${budget?.id ?? "new"}`}
                id="budget-scope-value"
                name="scopeValue"
                defaultValue={
                  defaultScopeValue
                }
                disabled={
                  Boolean(
                    budget,
                  ) ||
                  isSaving
                }
                required
              >
                {options.length ===
                0 ? (
                  <NativeSelectOption value="">
                    {
                      scopeType ===
                      "account"
                        ? "No connected AWS accounts"
                        : "No billed AWS services available"
                    }
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

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="budget-limit"
                >
                  Monthly limit
                </label>

                <Input
                  id="budget-limit"
                  name="monthlyLimit"
                  type="number"
                  min="0.01"
                  step="0.01"
                  defaultValue={
                    budget?.monthly_limit ??
                    100
                  }
                  required
                  disabled={
                    isSaving
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="warning-threshold"
                >
                  Warning %
                </label>

                <Input
                  id="warning-threshold"
                  name="warningThreshold"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={
                    budget?.warning_threshold ??
                    80
                  }
                  required
                  disabled={
                    isSaving
                  }
                />
              </div>

              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="critical-threshold"
                >
                  Critical %
                </label>

                <Input
                  id="critical-threshold"
                  name="criticalThreshold"
                  type="number"
                  min="1"
                  max="100"
                  defaultValue={
                    budget?.critical_threshold ??
                    100
                  }
                  required
                  disabled={
                    isSaving
                  }
                />
              </div>
            </div>

            {formError && (
              <p className="text-sm text-destructive">
                {
                  formError
                }
              </p>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              disabled={
                isSaving
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isSaving ||
                (
                  !budget &&
                  options.length ===
                    0
                )
              }
            >
              {
                isSaving
                  ? "Saving..."
                  : budget
                    ? "Save changes"
                    : "Create budget"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

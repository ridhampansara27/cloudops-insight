// Import React's form-event type.
import type { FormEvent } from "react";

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

// Import budget types.
import type {
  Budget,
  BudgetScopeType,
} from "@/types/budget";

// Define the properties required by the dialog.
interface BudgetDialogProps {
  // Control whether the dialog is visible.
  open: boolean;

  // Allow the parent to open or close the dialog.
  onOpenChange: (open: boolean) => void;

  // Supply an existing budget when editing.
  budget?: Budget | null;

  // Send the completed budget back to the page.
  onSave: (budget: Budget) => void;
}

// Export the reusable create/edit budget dialog.
export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  onSave,
}: BudgetDialogProps) {
  // Handle form submission.
  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    // Prevent the browser from reloading the page.
    event.preventDefault();

    // Read all submitted form fields.
    const formData = new FormData(
      event.currentTarget,
    );

    // Read and normalize the budget name.
    const name = String(
      formData.get("name") ?? "",
    ).trim();

    // Read the selected scope type.
    const scopeType = String(
      formData.get("scopeType") ?? "account",
    ) as BudgetScopeType;

    // Read and normalize the scope value.
    const scopeValue = String(
      formData.get("scopeValue") ?? "",
    ).trim();

    // Convert the monthly limit to a number.
    const monthlyLimit = Number(
      formData.get("monthlyLimit"),
    );

    // Convert the warning threshold to a number.
    const warningThreshold = Number(
      formData.get("warningThreshold"),
    );

    // Convert the critical threshold to a number.
    const criticalThreshold = Number(
      formData.get("criticalThreshold"),
    );

    // Stop when required text values are missing.
    if (
      name.length === 0 ||
      scopeValue.length === 0
    ) {
      return;
    }

    // Stop when the monthly budget is invalid.
    if (
      !Number.isFinite(monthlyLimit) ||
      monthlyLimit <= 0
    ) {
      return;
    }

    // Stop when the warning threshold is invalid.
    if (
      !Number.isFinite(warningThreshold) ||
      warningThreshold <= 0
    ) {
      return;
    }

    // Stop when the critical threshold is invalid.
    if (
      !Number.isFinite(criticalThreshold) ||
      criticalThreshold <= 0
    ) {
      return;
    }

    // Ensure the critical threshold is not below the warning threshold.
    if (
      criticalThreshold <
      warningThreshold
    ) {
      return;
    }

    // Build the new or updated budget.
    const nextBudget: Budget = {
      // Preserve the existing identifier while editing.
      id:
        budget?.id ??
        crypto.randomUUID(),

      // Store the normalized budget name.
      name,

      // Store the selected budget dimension.
      scopeType,

      // Store the normalized scope value.
      scopeValue,

      // Store the monthly spending limit.
      monthlyLimit,

      // Preserve observed spending while editing.
      currentSpend:
        budget?.currentSpend ?? 0,

      // Preserve forecast data while editing.
      forecastSpend:
        budget?.forecastSpend ?? 0,

      // Store the configured warning threshold.
      warningThreshold,

      // Store the configured critical threshold.
      criticalThreshold,

      // Preserve existing status while editing.
      status:
        budget?.status ?? "healthy",
    };

    // Return the completed budget to the parent page.
    onSave(nextBudget);

    // Close the dialog after saving.
    onOpenChange(false);
  }

  // Render the budget dialog.
  return (
    <Dialog
      // Control visibility from parent state.
      open={open}

      // Forward dialog visibility changes.
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {budget
              ? "Edit budget"
              : "Create budget"}
          </DialogTitle>

          <DialogDescription>
            Configure a monthly cloud spending limit and alert thresholds.
          </DialogDescription>
        </DialogHeader>

        {/* 
          Using a key forces the form to start with fresh default values
          when switching between create and edit modes.
        */}
        <form
          key={`${budget?.id ?? "new"}-${open}`}
          onSubmit={handleSubmit}
        >
          <div className="grid gap-4 py-2">
            {/* Budget name field. */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="budget-name"
              >
                Budget name
              </label>

              <Input
                // Provide the form-field name used by FormData.
                name="name"

                // Define the input identifier.
                id="budget-name"

                // Populate existing data while editing.
                defaultValue={
                  budget?.name ?? ""
                }

                // Display a useful example.
                placeholder="Production monthly budget"

                // Prevent empty submissions.
                required
              />
            </div>

            {/* Budget scope type. */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="budget-scope-type"
              >
                Scope type
              </label>

              <NativeSelect
                // Provide the form-field name.
                name="scopeType"

                // Define the control identifier.
                id="budget-scope-type"

                // Populate the existing scope when editing.
                defaultValue={
                  budget?.scopeType ??
                  "account"
                }
              >
                <NativeSelectOption value="account">
                  Account
                </NativeSelectOption>

                <NativeSelectOption value="service">
                  Service
                </NativeSelectOption>

                <NativeSelectOption value="environment">
                  Environment
                </NativeSelectOption>

                <NativeSelectOption value="team">
                  Team
                </NativeSelectOption>
              </NativeSelect>
            </div>

            {/* Budget scope value. */}
            <div className="space-y-2">
              <label
                className="text-sm font-medium"
                htmlFor="budget-scope"
              >
                Scope value
              </label>

              <Input
                // Provide the form-field name.
                name="scopeValue"

                // Define the input identifier.
                id="budget-scope"

                // Populate existing scope data while editing.
                defaultValue={
                  budget?.scopeValue ?? ""
                }

                // Display an example value.
                placeholder="production"

                // Prevent empty submissions.
                required
              />
            </div>

            {/* Numeric budget controls. */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Monthly limit. */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="budget-limit"
                >
                  Monthly limit
                </label>

                <Input
                  // Provide the form-field name.
                  name="monthlyLimit"

                  // Define the input identifier.
                  id="budget-limit"

                  // Accept numeric input.
                  type="number"

                  // Prevent zero and negative budgets.
                  min="1"

                  // Allow monetary decimal values.
                  step="0.01"

                  // Populate the current budget limit.
                  defaultValue={
                    budget?.monthlyLimit ??
                    100
                  }

                  // Require a value.
                  required
                />
              </div>

              {/* Warning threshold. */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="warning-threshold"
                >
                  Warning %
                </label>

                <Input
                  // Provide the form-field name.
                  name="warningThreshold"

                  // Define the input identifier.
                  id="warning-threshold"

                  // Accept numeric input.
                  type="number"

                  // Use a sensible minimum.
                  min="1"

                  // Keep percentages reasonable.
                  max="100"

                  // Populate the current warning threshold.
                  defaultValue={
                    budget?.warningThreshold ??
                    80
                  }

                  // Require a value.
                  required
                />
              </div>

              {/* Critical threshold. */}
              <div className="space-y-2">
                <label
                  className="text-sm font-medium"
                  htmlFor="critical-threshold"
                >
                  Critical %
                </label>

                <Input
                  // Provide the form-field name.
                  name="criticalThreshold"

                  // Define the input identifier.
                  id="critical-threshold"

                  // Accept numeric input.
                  type="number"

                  // Prevent invalid negative values.
                  min="1"

                  // Populate the current critical threshold.
                  defaultValue={
                    budget?.criticalThreshold ??
                    100
                  }

                  // Require a value.
                  required
                />
              </div>
            </div>
          </div>

          {/* Display form actions. */}
          <DialogFooter className="mt-4">
            <Button
              // Prevent this button from submitting the form.
              type="button"

              // Use secondary styling.
              variant="outline"

              // Close without saving.
              onClick={() =>
                onOpenChange(false)
              }
            >
              Cancel
            </Button>

            <Button
              // Submit the form.
              type="submit"
            >
              {budget
                ? "Save changes"
                : "Create budget"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
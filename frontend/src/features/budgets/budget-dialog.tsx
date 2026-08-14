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

// Import the API budget representation.
import type { BudgetApiResponse } from "@/types/api";

// Import the normalized frontend budget-scope type.
import type { BudgetScopeType } from "@/types/budget";

// Define the normalized form values returned by this dialog.
export interface BudgetFormValues {
  // Store the visible budget name.
  name: string;

  // Store the selected budget scope type.
  scopeType: BudgetScopeType;

  // Store the selected budget scope value.
  scopeValue: string;

  // Store the monthly spending limit.
  monthlyLimit: number;

  // Store the warning percentage.
  warningThreshold: number;

  // Store the critical percentage.
  criticalThreshold: number;
}

// Define the properties required by the dialog.
interface BudgetDialogProps {
  // Control whether the dialog is visible.
  open: boolean;

  // Allow the parent to open or close the dialog.
  onOpenChange: (open: boolean) => void;

  // Supply an API budget when editing.
  budget?: BudgetApiResponse | null;

  // Send normalized form values back to the parent.
  // The parent performs the actual backend API request.
  onSave: (
    values: BudgetFormValues,
  ) => Promise<void>;

  // Tell the dialog when a save request is running.
  isSaving?: boolean;
}

// Export the reusable create/edit budget dialog.
export function BudgetDialog({
  open,
  onOpenChange,
  budget,
  onSave,
  isSaving = false,
}: BudgetDialogProps) {
  // Handle form submission.
  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    // Prevent the browser from reloading the page.
    event.preventDefault();

    // Prevent duplicate submissions while the request is running.
    if (isSaving) {
      return;
    }

    // Read all submitted form fields.
    const formData = new FormData(
      event.currentTarget,
    );

    // Read and normalize the budget name.
    const name = String(
      formData.get("name") ?? "",
    ).trim();

    /*
     * Scope fields are disabled while editing.
     * Disabled HTML fields are not included in FormData,
     * so preserve the existing API values in edit mode.
     */
    const scopeType = (
      budget?.scope_type ??
      String(
        formData.get("scopeType") ??
          "account",
      )
    ) as BudgetScopeType;

    // Preserve the existing scope value while editing.
    const scopeValue = (
      budget?.scope_value ??
      String(
        formData.get("scopeValue") ?? "",
      )
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

    // Build normalized values for the API integration layer.
    const values: BudgetFormValues = {
      // Store the normalized name.
      name,

      // Store the selected or existing scope type.
      scopeType,

      // Store the selected or existing scope value.
      scopeValue,

      // Store the numeric monthly limit.
      monthlyLimit,

      // Store the warning threshold.
      warningThreshold,

      // Store the critical threshold.
      criticalThreshold,
    };

    /*
     * Wait for the parent API operation to succeed.
     * If onSave rejects, execution stops here and the
     * dialog remains open.
     */
    await onSave(values);

    // Close only after the backend request succeeds.
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

                // Populate existing API data while editing.
                defaultValue={
                  budget?.name ?? ""
                }

                // Display a useful example.
                placeholder="Production monthly budget"

                // Prevent empty submissions.
                required

                // Prevent changes while saving.
                disabled={isSaving}
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

                // Populate the API scope when editing.
                defaultValue={
                  budget?.scope_type ??
                  "account"
                }

                /*
                 * Scope cannot be changed after creation.
                 * Also prevent interaction while saving.
                 */
                disabled={
                  Boolean(budget) ||
                  isSaving
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

                // Populate existing API scope data while editing.
                defaultValue={
                  budget?.scope_value ?? ""
                }

                // Display an example value.
                placeholder="production"

                // Prevent empty submissions.
                required

                /*
                 * Scope cannot be changed after creation.
                 * Also prevent interaction while saving.
                 */
                disabled={
                  Boolean(budget) ||
                  isSaving
                }
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

                  // Populate the backend API monthly limit.
                  defaultValue={
                    budget?.monthly_limit ??
                    100
                  }

                  // Require a value.
                  required

                  // Prevent changes while saving.
                  disabled={isSaving}
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

                  // Populate the backend warning threshold.
                  defaultValue={
                    budget?.warning_threshold ??
                    80
                  }

                  // Require a value.
                  required

                  // Prevent changes while saving.
                  disabled={isSaving}
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

                  // Populate the backend critical threshold.
                  defaultValue={
                    budget?.critical_threshold ??
                    100
                  }

                  // Require a value.
                  required

                  // Prevent changes while saving.
                  disabled={isSaving}
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

              // Prevent closing from this button while saving.
              disabled={isSaving}
            >
              Cancel
            </Button>

            <Button
              // Submit the form.
              type="submit"

              // Prevent duplicate API requests.
              disabled={isSaving}
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
// Import React form typing.
import type {
  FormEvent,
} from "react";

// Import reusable UI controls.
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


// Define normalized form values.
export interface AwsAccountFormValues {
  // Store user-visible name.
  name: string;

  // Store AWS account ID.
  accountId: string;

  // Store AssumeRole ARN.
  roleArn: string | null;

  // Store STS ExternalId.
  externalId: string | null;

  // Store enabled AWS regions.
  enabledRegions: string[];
}


// Define dialog properties.
interface AwsAccountDialogProps {
  // Control dialog visibility.
  open: boolean;

  // Update dialog visibility.
  onOpenChange: (
    open: boolean,
  ) => void;

  // Persist account configuration.
  onSave: (
    values: AwsAccountFormValues,
  ) => Promise<void>;

  // Disable submit while API request is running.
  isSaving: boolean;
}


// Export AWS connection dialog.
export function AwsAccountDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: AwsAccountDialogProps) {
  // Handle form submission.
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    // Prevent browser navigation.
    event.preventDefault();

    // Read uncontrolled form fields.
    const formData =
      new FormData(
        event.currentTarget,
      );

    // Read display name.
    const name = String(
      formData.get(
        "name",
      ) ?? "",
    ).trim();

    // Read AWS account ID.
    const accountId = String(
      formData.get(
        "accountId",
      ) ?? "",
    ).trim();

    // Read IAM role ARN.
    const roleArn = String(
      formData.get(
        "roleArn",
      ) ?? "",
    ).trim();

    // Read ExternalId.
    const externalId = String(
      formData.get(
        "externalId",
      ) ?? "",
    ).trim();

    // Parse comma-separated AWS regions.
    const enabledRegions =
      String(
        formData.get(
          "regions",
        ) ?? "",
      )
        .split(
          ",",
        )
        .map(
          (region) =>
            region.trim(),
        )
        .filter(
          Boolean,
        );

    // Require a display name.
    if (!name) {
      return;
    }

    // Require a normal twelve-digit AWS account ID.
    if (
      !/^\d{12}$/.test(
        accountId,
      )
    ) {
      return;
    }

    // Require at least one discovery region.
    if (
      enabledRegions.length ===
      0
    ) {
      return;
    }

    // Persist account through FastAPI.
    await onSave({
      name,
      accountId,
      roleArn:
        roleArn ||
        null,
      externalId:
        externalId ||
        null,
      enabledRegions,
    });

    // Close only after successful API creation.
    onOpenChange(
      false,
    );
  }

  // Render account registration form.
  return (
    <Dialog
      open={open}
      onOpenChange={
        onOpenChange
      }
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Add AWS account
          </DialogTitle>

          <DialogDescription>
            Configure read-only AWS discovery through IAM AssumeRole.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-4"
        >
          <div className="space-y-2">
            <label
              htmlFor="aws-name"
              className="text-sm font-medium"
            >
              Account name
            </label>

            <Input
              id="aws-name"
              name="name"
              placeholder="Personal AWS Account"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="aws-account-id"
              className="text-sm font-medium"
            >
              AWS account ID
            </label>

            <Input
              id="aws-account-id"
              name="accountId"
              placeholder="123456789012"
              pattern="[0-9]{12}"
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="aws-role"
              className="text-sm font-medium"
            >
              Read-only role ARN
            </label>

            <Input
              id="aws-role"
              name="roleArn"
              placeholder="arn:aws:iam::123456789012:role/CloudOpsReadOnlyRole"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="aws-external-id"
              className="text-sm font-medium"
            >
              External ID
            </label>

            <Input
              id="aws-external-id"
              name="externalId"
              placeholder="CloudOps role ExternalId"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="aws-regions"
              className="text-sm font-medium"
            >
              Discovery regions
            </label>

            <Input
              id="aws-regions"
              name="regions"
              defaultValue="eu-central-1"
              placeholder="eu-central-1, eu-west-1"
              required
            />

            <p className="text-xs text-muted-foreground">
              Separate multiple AWS regions with commas.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={
                isSaving
              }
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={
                isSaving
              }
            >
              {isSaving
                ? "Adding..."
                : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
// Import React form/state typing.
import {
  type FormEvent,
  useState,
} from "react";

// Import cloud-registration icons.
import {
  CloudCog,
  Fingerprint,
  KeyRound,
  MapPin,
  ShieldCheck,
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


// Define normalized form values.
export interface AwsAccountFormValues {
  // User-visible account name.
  name: string;

  // Twelve-digit AWS account ID.
  accountId: string;

  // Optional AWS AssumeRole ARN.
  roleArn:
    | string
    | null;

  // Optional STS ExternalId.
  externalId:
    | string
    | null;

  // Regions CloudOps should discover.
  enabledRegions:
    string[];
}


// Define registration-dialog properties.
interface AwsAccountDialogProps {
  // Control dialog visibility.
  open: boolean;

  // Update dialog visibility.
  onOpenChange: (
    open: boolean,
  ) => void;

  // Persist through the existing FastAPI account endpoint.
  onSave: (
    values:
      AwsAccountFormValues,
  ) => Promise<void>;

  // Prevent duplicate account registration.
  isSaving: boolean;
}


// Export the premium AWS account registration dialog.
export function AwsAccountDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: AwsAccountDialogProps) {
  // Store visible client-side or persistence validation error.
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  // Reset transient form errors when the dialog closes.
  function handleOpenChange(
    nextOpen:
      boolean,
  ) {
    if (
      !nextOpen
    ) {
      setFormError(
        null,
      );
    }

    onOpenChange(
      nextOpen,
    );
  }

  // Validate and submit account registration.
  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    // Prevent native page submission.
    event.preventDefault();

    // Ignore duplicate submission while the request is active.
    if (
      isSaving
    ) {
      return;
    }

    // Clear previous error.
    setFormError(
      null,
    );

    // Read uncontrolled form values.
    const formData =
      new FormData(
        event.currentTarget,
      );

    // Normalize visible account name.
    const name =
      String(
        formData.get(
          "name",
        ) ??
        "",
      ).trim();

    // Normalize AWS account identifier.
    const accountId =
      String(
        formData.get(
          "accountId",
        ) ??
        "",
      ).trim();

    // Normalize optional AssumeRole ARN.
    const roleArn =
      String(
        formData.get(
          "roleArn",
        ) ??
        "",
      ).trim();

    // Normalize optional STS ExternalId.
    const externalId =
      String(
        formData.get(
          "externalId",
        ) ??
        "",
      ).trim();

    // Parse comma-separated discovery regions.
    const enabledRegions =
      Array.from(
        new Set(
          String(
            formData.get(
              "regions",
            ) ??
            "",
          )
            .split(
              ",",
            )
            .map(
              (
                region,
              ) =>
                region
                  .trim()
                  .toLowerCase(),
            )
            .filter(
              Boolean,
            ),
        ),
      );

    // Require a visible account name.
    if (
      name.length ===
      0
    ) {
      setFormError(
        "Enter an account name.",
      );

      return;
    }

    // AWS account IDs contain exactly twelve digits.
    if (
      !/^\d{12}$/.test(
        accountId,
      )
    ) {
      setFormError(
        "AWS account ID must contain exactly 12 digits.",
      );

      return;
    }

    // At least one discovery region is required.
    if (
      enabledRegions.length ===
      0
    ) {
      setFormError(
        "Enter at least one AWS discovery region.",
      );

      return;
    }

    try {
      // Persist through the existing backend callback.
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

      // Close only after successful creation.
      handleOpenChange(
        false,
      );
    } catch {
      // Keep the form open after backend rejection.
      setFormError(
        "CloudOps could not register this AWS account. Review the configuration and try again.",
      );
    }
  }

  // Render AWS registration workflow.
  return (
    <Dialog
      onOpenChange={
        handleOpenChange
      }
      open={
        open
      }
    >
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-2xl">
        {/* Cloud integration atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-64 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-violet-500/8 blur-3xl"
        />

        <DialogHeader className="relative shrink-0 border-b border-border/50 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
              <CloudCog className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                Add AWS account
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                Register AWS discovery configuration. Validate the
                connection through STS after registration before starting
                inventory synchronization.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="relative flex min-h-0 flex-1 flex-col"
          key={
            open
              ? "open"
              : "closed"
          }
          onSubmit={
            handleSubmit
          }
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-color:rgba(148,163,184,0.28)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] sm:px-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-500/30">
            {/* AWS account identity. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-3.5">
              <div className="mb-4 flex items-center gap-2">
                <Fingerprint className="size-4 text-primary" />

                <p className="text-sm font-semibold">
                  AWS account identity
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="aws-name"
                  >
                    Account name
                  </label>

                  <Input
                    autoComplete="off"
                    className="rounded-xl bg-background/30"
                    disabled={
                      isSaving
                    }
                    id="aws-name"
                    name="name"
                    placeholder="Production AWS"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="aws-account-id"
                  >
                    AWS account ID
                  </label>

                  <Input
                    autoComplete="off"
                    className="rounded-xl bg-background/30 font-mono"
                    disabled={
                      isSaving
                    }
                    id="aws-account-id"
                    inputMode="numeric"
                    maxLength={
                      12
                    }
                    name="accountId"
                    pattern="[0-9]{12}"
                    placeholder="123456789012"
                    required
                  />

                  <p className="text-[11px] text-muted-foreground">
                    Twelve-digit AWS account identifier.
                  </p>
                </div>
              </div>
            </div>

            {/* AWS access configuration. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-3.5">
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="size-4 text-violet-300" />

                <p className="text-sm font-semibold">
                  Provider access
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="aws-role"
                  >
                    AssumeRole ARN
                    <span className="ml-1 font-normal">
                      (optional)
                    </span>
                  </label>

                  <Input
                    autoComplete="off"
                    className="rounded-xl bg-background/30 font-mono text-xs"
                    disabled={
                      isSaving
                    }
                    id="aws-role"
                    name="roleArn"
                    placeholder="arn:aws:iam::123456789012:role/CloudOpsReadOnlyRole"
                  />

                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    For deployed environments, use a least-privilege
                    read-only IAM role that CloudOps can assume.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-medium text-muted-foreground"
                    htmlFor="aws-external-id"
                  >
                    STS External ID
                    <span className="ml-1 font-normal">
                      (optional)
                    </span>
                  </label>

                  <Input
                    autoComplete="off"
                    className="rounded-xl bg-background/30"
                    disabled={
                      isSaving
                    }
                    id="aws-external-id"
                    name="externalId"
                    placeholder="ExternalId configured in the role trust policy"
                  />
                </div>
              </div>
            </div>

            {/* Resource-discovery regions. */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-3.5">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="size-4 text-sky-300" />

                <p className="text-sm font-semibold">
                  Discovery scope
                </p>
              </div>

              <div className="space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="aws-regions"
                >
                  AWS regions
                </label>

                <Input
                  autoComplete="off"
                  className="rounded-xl bg-background/30 font-mono text-xs"
                  defaultValue="eu-central-1"
                  disabled={
                    isSaving
                  }
                  id="aws-regions"
                  name="regions"
                  placeholder="eu-central-1, eu-west-1"
                  required
                />

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Separate multiple AWS regions with commas. Duplicate
                  region entries are removed automatically.
                </p>
              </div>
            </div>

            {/* Explain the validation sequence rather than pretending
                registration immediately establishes provider access. */}
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" />

                <div>
                  <p className="text-sm font-semibold">
                    Validation happens after registration
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    The account starts in Pending state. Use Validate on
                    the account card to verify AWS identity through STS;
                    resource synchronization becomes available only after
                    validation succeeds.
                  </p>
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

          <DialogFooter className="shrink-0 border-t border-border/50 bg-background/75 px-5 py-3.5 backdrop-blur-xl sm:px-6">
            <Button
              className="rounded-xl"
              disabled={
                isSaving
              }
              onClick={() =>
                handleOpenChange(
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
                isSaving
              }
              type="submit"
            >
              {isSaving
                ? "Adding account..."
                : "Register AWS account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

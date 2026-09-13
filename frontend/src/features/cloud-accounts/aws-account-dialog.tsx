// Import React form/state support.
import {
  type FormEvent,
  useState,
} from "react";

// Import workflow icons.
import {
  CloudCog,
  Fingerprint,
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


// Define normalized phase-one form values.
export interface AwsAccountFormValues {
  name: string;

  accountId: string;

  enabledRegions: string[];
}


interface AwsAccountDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onSave: (
    values: AwsAccountFormValues,
  ) => Promise<void>;

  isSaving: boolean;
}


// Phase one deliberately collects no IAM Role ARN
// and no ExternalId.
//
// The backend creates the pending integration and
// generates the ExternalId before IAM configuration.
export function AwsAccountDialog({
  open,
  onOpenChange,
  onSave,
  isSaving,
}: AwsAccountDialogProps) {
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);


  function handleOpenChange(
    nextOpen: boolean,
  ) {
    if (!nextOpen) {
      setFormError(
        null,
      );
    }

    onOpenChange(
      nextOpen,
    );
  }


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

    const accountId =
      String(
        formData.get(
          "accountId",
        ) ?? "",
      ).trim();

    const enabledRegions =
      Array.from(
        new Set(
          String(
            formData.get(
              "regions",
            ) ?? "",
          )
            .split(",")
            .map(
              (region) =>
                region
                  .trim()
                  .toLowerCase(),
            )
            .filter(Boolean),
        ),
      );


    if (!name) {
      setFormError(
        "Enter an account name.",
      );

      return;
    }


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
      await onSave({
        name,
        accountId,
        enabledRegions,
      });

      handleOpenChange(
        false,
      );
    } catch {
      setFormError(
        "CloudOps could not start AWS onboarding. Review the account details and try again.",
      );
    }
  }


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

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-cyan-300">
                Step 1 of 2
              </div>

              <DialogTitle>
                Register AWS account
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                Start the secure integration. CloudOps will generate the
                ExternalId and IAM trust configuration after registration.
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
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6">
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
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
                    maxLength={12}
                    name="accountId"
                    pattern="[0-9]{12}"
                    placeholder="123456789012"
                    required
                  />

                  <p className="text-[11px] text-muted-foreground">
                    Exactly 12 digits.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
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
                  Separate regions with commas. You can adjust this later.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-cyan-300" />

                <div>
                  <p className="text-sm font-semibold">
                    No AWS credentials are entered here
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    CloudOps uses cross-account STS AssumeRole. After this
                    step you will receive a generated ExternalId and the
                    exact IAM trust policy to configure in AWS.
                  </p>
                </div>
              </div>
            </div>

            {formError && (
              <div className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                {formError}
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
                ? "Registering..."
                : "Continue to IAM setup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
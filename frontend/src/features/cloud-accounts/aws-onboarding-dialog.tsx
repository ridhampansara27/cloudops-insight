import {
  type FormEvent,
  useState,
} from "react";

import {
  AlertTriangle,
  Check,
  CloudCog,
  Copy,
  ExternalLink,
  Fingerprint,
  KeyRound,
  ShieldCheck,
} from "lucide-react";

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

import type {
  CloudAccountOnboardingApiResponse,
} from "@/types/api";


interface AwsOnboardingDialogProps {
  open: boolean;

  onboarding:
    | CloudAccountOnboardingApiResponse
    | null;

  onOpenChange: (
    open: boolean,
  ) => void;

  onSaveAndValidate: (
    roleArn: string,
  ) => Promise<void>;

  isSaving: boolean;
}


type CopiedValue =
  | "external-id"
  | "principal"
  | "policy"
  | null;


export function AwsOnboardingDialog({
  open,
  onboarding,
  onOpenChange,
  onSaveAndValidate,
  isSaving,
}: AwsOnboardingDialogProps) {
  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  const [
    copied,
    setCopied,
  ] =
    useState<CopiedValue>(
      null,
    );


  const trustPolicyText =
    onboarding?.trust_policy
      ? JSON.stringify(
          onboarding.trust_policy,
          null,
          2,
        )
      : "";


  async function copyValue(
    value: string,
    key: CopiedValue,
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );

      setCopied(
        key,
      );

      window.setTimeout(
        () => {
          setCopied(
            null,
          );
        },
        1_800,
      );
    } catch {
      setFormError(
        "The browser could not copy this value automatically. Select and copy it manually.",
      );
    }
  }


  function handleOpenChange(
    nextOpen: boolean,
  ) {
    if (!nextOpen) {
      setFormError(
        null,
      );

      setCopied(
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

    if (
      !onboarding ||
      isSaving
    ) {
      return;
    }

    setFormError(
      null,
    );

    const formData =
      new FormData(
        event.currentTarget,
      );

    const roleArn =
      String(
        formData.get(
          "roleArn",
        ) ?? "",
      ).trim();


    if (!roleArn) {
      setFormError(
        "Enter the IAM Role ARN created in your AWS account.",
      );

      return;
    }


    const rolePattern =
      /^arn:(aws|aws-us-gov|aws-cn):iam::(\d{12}):role\/.+$/;

    const match =
      rolePattern.exec(
        roleArn,
      );


    if (!match) {
      setFormError(
        "Enter a valid AWS IAM role ARN.",
      );

      return;
    }


    if (
      match[2] !==
      onboarding.external_account_id
    ) {
      setFormError(
        "The IAM role must belong to the AWS account being connected.",
      );

      return;
    }


    try {
      await onSaveAndValidate(
        roleArn,
      );

      handleOpenChange(
        false,
      );
    } catch {
      setFormError(
        "CloudOps saved the onboarding state but could not validate AWS access. Confirm the IAM trust policy and role permissions, then try again.",
      );
    }
  }


  if (!onboarding) {
    return null;
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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-3xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-32 size-72 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-28 -top-32 size-72 rounded-full bg-violet-500/9 blur-3xl"
        />

        <DialogHeader className="relative shrink-0 border-b border-border/50 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/8 text-violet-300">
              <ShieldCheck className="size-[18px]" />
            </div>

            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center rounded-full border border-violet-400/20 bg-violet-400/8 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.15em] text-violet-300">
                Step 2 of 2
              </div>

              <DialogTitle>
                Configure secure AWS access
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                Configure the generated trust policy in AWS, create the
                read-only role, then let CloudOps validate it through STS.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          className="relative flex min-h-0 flex-1 flex-col"
          key={`${onboarding.id}-${open ? "open" : "closed"}`}
          onSubmit={
            handleSubmit
          }
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-4 [scrollbar-color:rgba(148,163,184,0.28)_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] sm:px-6">
            {/* Account identity */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/55 bg-background/20 p-3.5">
                <div className="flex items-center gap-2">
                  <Fingerprint className="size-3.5 text-cyan-300" />

                  <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                    AWS account
                  </p>
                </div>

                <p className="mt-2 font-semibold">
                  {onboarding.name}
                </p>

                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  {onboarding.external_account_id}
                </p>
              </div>

              <div className="rounded-xl border border-border/55 bg-background/20 p-3.5">
                <div className="flex items-center gap-2">
                  <CloudCog className="size-3.5 text-violet-300" />

                  <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                    Recommended role
                  </p>
                </div>

                <p className="mt-2 break-all font-mono text-xs font-medium">
                  {onboarding.suggested_role_name}
                </p>
              </div>
            </div>

            {/* ExternalId */}
            <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <KeyRound className="size-4 text-cyan-300" />

                    <p className="text-sm font-semibold">
                      CloudOps ExternalId
                    </p>
                  </div>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Keep this exact value in the IAM role trust policy.
                    CloudOps generated it specifically for this integration.
                  </p>
                </div>

                <Button
                  className="shrink-0 rounded-xl"
                  onClick={() =>
                    void copyValue(
                      onboarding.external_id,
                      "external-id",
                    )
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {copied ===
                  "external-id" ? (
                    <Check className="mr-2 size-3.5" />
                  ) : (
                    <Copy className="mr-2 size-3.5" />
                  )}

                  {copied ===
                  "external-id"
                    ? "Copied"
                    : "Copy"}
                </Button>
              </div>

              <div className="mt-3 break-all rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 font-mono text-xs text-cyan-100">
                {onboarding.external_id}
              </div>
            </div>

            {/* Platform principal */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    CloudOps trusted principal
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Your IAM role must trust this CloudOps AWS principal.
                  </p>
                </div>

                {onboarding.platform_principal_arn && (
                  <Button
                    className="shrink-0 rounded-xl"
                    onClick={() =>
                      void copyValue(
                        onboarding.platform_principal_arn ?? "",
                        "principal",
                      )
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    {copied ===
                    "principal" ? (
                      <Check className="mr-2 size-3.5" />
                    ) : (
                      <Copy className="mr-2 size-3.5" />
                    )}

                    {copied ===
                    "principal"
                      ? "Copied"
                      : "Copy"}
                  </Button>
                )}
              </div>

              <div className="mt-3 break-all rounded-lg border border-border/50 bg-background/40 px-3 py-2.5 font-mono text-xs">
                {onboarding.platform_principal_arn ??
                  "CloudOps platform principal is not configured in this environment."}
              </div>
            </div>

            {/* Trust policy */}
            <div className="rounded-xl border border-border/55 bg-background/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    IAM role trust policy
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Paste this JSON into the role Trust relationships policy.
                  </p>
                </div>

                <div className="flex gap-2">
                  {trustPolicyText && (
                    <Button
                      className="rounded-xl"
                      onClick={() =>
                        void copyValue(
                          trustPolicyText,
                          "policy",
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {copied ===
                      "policy" ? (
                        <Check className="mr-2 size-3.5" />
                      ) : (
                        <Copy className="mr-2 size-3.5" />
                      )}

                      {copied ===
                      "policy"
                        ? "Copied"
                        : "Copy JSON"}
                    </Button>
                  )}

                  <a
                    className="inline-flex h-7 items-center justify-center gap-1 rounded-xl border border-border bg-background px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all hover:bg-muted hover:text-foreground"
                    href="https://console.aws.amazon.com/iam/home#/roles"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="mr-1 size-3.5" />

                    Open IAM
                  </a>
                </div>
              </div>

              {trustPolicyText ? (
                <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-border/50 bg-background/50 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
                  {trustPolicyText}
                </pre>
              ) : (
                <div className="mt-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />

                    <p className="text-xs leading-relaxed text-muted-foreground">
                      This environment has no CloudOps AWS platform principal
                      configured, so a valid trust policy cannot yet be
                      generated. Do not create the customer role until the
                      platform principal is configured.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Final Role ARN */}
            <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-violet-300" />

                <p className="text-sm font-semibold">
                  Finish connection
                </p>
              </div>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                After creating the role in AWS, paste its ARN below.
                CloudOps will store the role configuration and immediately
                verify it with STS AssumeRole.
              </p>

              <div className="mt-4 space-y-2">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="aws-onboarding-role"
                >
                  IAM Role ARN
                </label>

                <Input
                  autoComplete="off"
                  className="rounded-xl bg-background/40 font-mono text-xs"
                  defaultValue={
                    onboarding.role_arn ??
                    ""
                  }
                  disabled={
                    isSaving ||
                    !onboarding.onboarding_ready
                  }
                  id="aws-onboarding-role"
                  name="roleArn"
                  placeholder={`arn:aws:iam::${onboarding.external_account_id}:role/${onboarding.suggested_role_name}`}
                  required
                />
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
              Finish later
            </Button>

            <Button
              className="rounded-xl"
              disabled={
                isSaving ||
                !onboarding.onboarding_ready
              }
              type="submit"
            >
              <ShieldCheck className="mr-2 size-4" />

              {isSaving
                ? "Validating AWS..."
                : "Save role & validate"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
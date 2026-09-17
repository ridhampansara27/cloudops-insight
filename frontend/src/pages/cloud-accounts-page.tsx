// Import page state.
import {
  useState,
} from "react";

// Import AWS control-plane icons.
import {
  Activity,
  AlertTriangle,
  CircleCheckBig,
  Cloud,
  CloudCog,
  Fingerprint,
  KeyRound,
  MapPin,
  Plus,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Trash2,
  Unplug,
  Wifi,
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

// Import AWS registration dialog.
import {
  AwsAccountDialog,
} from "@/features/cloud-accounts/aws-account-dialog";

import type {
  AwsAccountFormValues,
} from "@/features/cloud-accounts/aws-account-dialog";

// Import guided phase-two IAM setup.
import {
  AwsOnboardingDialog,
} from "@/features/cloud-accounts/aws-onboarding-dialog";

// Import safe disconnect confirmation.
import {
  AwsDisconnectDialog,
} from "@/features/cloud-accounts/aws-disconnect-dialog";

import {
  AwsRemoveDialog,
} from "@/features/cloud-accounts/aws-remove-dialog";

// Import genuine backend operations.
import {
  useCloudAccountOnboarding,
  useCloudAccounts,
  useCreateCloudAccount,
  useDisconnectCloudAccount,
  useRemoveCloudAccount,
  useSyncCloudAccount,
  useUpdateCloudAccountRole,
  useValidateCloudAccount,
} from "@/features/cloud-accounts/api/cloud-accounts-api";

import type {
  CloudAccountApiResponse,
  CloudAccountOnboardingApiResponse,
} from "@/types/api";

// Import timestamp formatting.
import {
  formatTimestamp,
} from "@/lib/formatters";


// ------------------------------------------------------------
// Cloud-account visual semantics
// ------------------------------------------------------------

// Map genuine AWS validation state into UI semantics.
function getConnectionStyle(
  status: string,
) {
  if (
    status ===
    "connected"
  ) {
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

      label:
        "Connected",

      Icon:
        CircleCheckBig,
    };
  }

  if (
    status ===
    "error"
  ) {
    return {
      badge:
        "border-rose-400/20 bg-rose-400/8 text-rose-300",

      label:
        "Validation error",

      Icon:
        AlertTriangle,
    };
  }

  if (
    status ===
    "pending"
  ) {
    return {
      badge:
        "border-amber-400/20 bg-amber-400/8 text-amber-300",

      label:
        "IAM setup required",

      Icon:
        ShieldCheck,
    };
  }

  if (
    status ===
    "disconnected"
  ) {
    return {
      badge:
        "border-slate-400/20 bg-slate-400/8 text-slate-300",

      label:
        "Disconnected",

      Icon:
        Unplug,
    };
  }

  if (
    status ===
    "disconnecting"
  ) {
    return {
      badge:
        "border-amber-400/20 bg-amber-400/8 text-amber-300",

      label:
        "Disconnecting",

      Icon:
        Unplug,
    };
  }

  if (
    status ===
    "removing"
  ) {
    return {
      badge:
        "border-rose-400/20 bg-rose-400/8 text-rose-300",

      label:
        "Removing",

      Icon:
        Trash2,
    };
  }

  if (
    status ===
    "disabled"
  ) {
    return {
      badge:
        "border-border/70 bg-muted/30 text-muted-foreground",

      label:
        "Disabled",

      Icon:
        Cloud,
    };
  }

  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      status,

    Icon:
      Cloud,
  };
}


// Map the persisted Celery resource-sync lifecycle into UI semantics.
function getSyncStyle(
  status: string,
) {
  if (
    status ===
      "queued" ||
    status ===
      "running"
  ) {
    return {
      badge:
        "border-violet-400/20 bg-violet-400/8 text-violet-300",

      label:
        status ===
        "queued"
          ? "Queued"
          : "Running",
    };
  }

  if (
    status ===
    "succeeded"
  ) {
    return {
      badge:
        "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

      label:
        "Succeeded",
    };
  }

  if (
    status ===
    "failed"
  ) {
    return {
      badge:
        "border-rose-400/20 bg-rose-400/8 text-rose-300",

      label:
        "Failed",
    };
  }

  if (
    status ===
    "idle"
  ) {
    return {
      badge:
        "border-sky-400/20 bg-sky-400/8 text-sky-300",

      label:
        "Idle",
    };
  }

  return {
    badge:
      "border-border/70 bg-muted/30 text-muted-foreground",

    label:
      status,
  };
}


// Export the AWS integration control plane.
export function CloudAccountsPage() {
  // Store Add Account dialog visibility.
  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  // Store secure phase-two onboarding dialog visibility.
  const [
    onboardingOpen,
    setOnboardingOpen,
  ] =
    useState(false);

  // Store owner/admin-only onboarding material only while needed.
  const [
    onboardingAccount,
    setOnboardingAccount,
  ] =
    useState<
      CloudAccountOnboardingApiResponse | null
    >(null);

  // Store the account selected for safe disconnect confirmation.
  const [
    disconnectAccount,
    setDisconnectAccount,
  ] =
    useState<
      CloudAccountApiResponse | null
    >(null);

  // Store the account selected for permanent CloudOps-data removal.
  const [
    removeAccount,
    setRemoveAccount,
  ] =
    useState<
      CloudAccountApiResponse | null
    >(null);

  // Load registered AWS account configurations.
  // The API hook already polls every five seconds so Celery
  // synchronization state updates automatically.
  const accountsQuery =
    useCloudAccounts();

  // Initialize existing backend mutations.
  const createAccount =
    useCreateCloudAccount();

  const onboardingQuery =
    useCloudAccountOnboarding();

  const updateAccountRole =
    useUpdateCloudAccountRole();

  const disconnectCloudAccount =
    useDisconnectCloudAccount();

  const removeCloudAccount =
    useRemoveCloudAccount();

  const validateAccount =
    useValidateCloudAccount();

  const syncAccount =
    useSyncCloudAccount();

  // Start secure phase-one AWS onboarding.
  async function handleCreate(
    values:
      AwsAccountFormValues,
  ) {
    try {
      const onboarding =
        await createAccount.mutateAsync({
          name:
            values.name,

          provider:
            "aws",

          external_account_id:
            values.accountId,

          enabled_regions:
            values.enabledRegions,
        });

      // Immediately continue into generated IAM setup.
      setOnboardingAccount(
        onboarding,
      );

      setOnboardingOpen(
        true,
      );

      toast.success(
        "AWS account registered. Configure the IAM role next.",
      );
    } catch {
      toast.error(
        "Unable to start AWS onboarding.",
      );

      throw new Error(
        "AWS account creation failed.",
      );
    }
  }


  // Resume phase-two IAM setup for a pending/error integration.
  async function handleContinueSetup(
    accountId:
      string,
  ) {
    try {
      const onboarding =
        await onboardingQuery.mutateAsync(
          accountId,
        );

      setOnboardingAccount(
        onboarding,
      );

      setOnboardingOpen(
        true,
      );
    } catch {
      toast.error(
        "Unable to load AWS onboarding configuration.",
      );
    }
  }


  // Store the customer role then verify real AssumeRole connectivity.
  async function handleSaveRoleAndValidate(
    roleArn:
      string,
  ) {
    if (!onboardingAccount) {
      throw new Error(
        "AWS onboarding state is unavailable.",
      );
    }

    try {
      const updated =
        await updateAccountRole.mutateAsync({
          accountId:
            onboardingAccount.id,

          roleArn,
        });

      // Keep the security material in memory while updating
      // the public account fields returned from PATCH.
      setOnboardingAccount(
        (
          current,
        ) =>
          current
            ? {
                ...current,
                ...updated,
                external_id:
                  current.external_id,
                platform_principal_arn:
                  current.platform_principal_arn,
                suggested_role_name:
                  current.suggested_role_name,
                trust_policy:
                  current.trust_policy,
                onboarding_ready:
                  current.onboarding_ready,
              }
            : null,
      );

      await validateAccount.mutateAsync(
        onboardingAccount.id,
      );

      toast.success(
        "AWS connection validated successfully.",
      );

      setOnboardingAccount(
        null,
      );
    } catch {
      toast.error(
        "AWS connection validation failed.",
      );

      throw new Error(
        "AWS onboarding validation failed.",
      );
    }
  }


  // Validate one account through the existing AWS STS endpoint.
  async function handleValidate(
    accountId:
      string,
  ) {
    try {
      await validateAccount.mutateAsync(
        accountId,
      );

      toast.success(
        "AWS connection validated.",
      );
    } catch {
      toast.error(
        "AWS connection validation failed.",
      );
    }
  }

  // Stop CloudOps provider access without deleting AWS resources.
  async function handleDisconnect() {
    if (!disconnectAccount) {
      return;
    }

    try {
      const result =
        await disconnectCloudAccount.mutateAsync(
          disconnectAccount.id,
        );

      setDisconnectAccount(
        null,
      );

      const budgetMessage =
        result.account_budgets_deactivated > 0
          ? ` ${result.account_budgets_deactivated} account budget${
              result.account_budgets_deactivated === 1
                ? ""
                : "s"
            } deactivated.`
          : "";

      toast.success(
        `AWS integration disconnected.${budgetMessage}`,
      );
    } catch {
      toast.error(
        "Unable to disconnect AWS integration.",
      );
    }
  }


  // Permanently remove the integration and CloudOps-imported data.
  async function handleRemoveIntegration() {
    if (!removeAccount) {
      return;
    }

    try {
      const result =
        await removeCloudAccount.mutateAsync(
          removeAccount.id,
        );

      setRemoveAccount(
        null,
      );

      toast.success(
        result.message,
      );
    } catch {
      toast.error(
        "Unable to permanently remove AWS integration data.",
      );
    }
  }


  // Queue genuine resource discovery through Celery.
  async function handleSync(
    accountId:
      string,
  ) {
    try {
      await syncAccount.mutateAsync(
        accountId,
      );

      toast.success(
        "AWS synchronization queued.",
      );
    } catch {
      toast.error(
        "Unable to start AWS synchronization.",
      );
    }
  }

  // Render initial account loading state.
  if (
    accountsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Render recoverable backend failure.
  if (
    accountsQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load AWS accounts"
        description="CloudOps Insight could not retrieve registered cloud-account configuration."
        onRetry={() => {
          void accountsQuery.refetch();
        }}
      />
    );
  }

  // Store successful backend account data.
  const accounts =
    accountsQuery.data;

  // Count genuinely connected AWS accounts.
  const connectedAccounts =
    accounts.filter(
      (
        account,
      ) =>
        account.status ===
        "connected",
    );

  // Count integrations requiring setup, validation or reconnection.
  const pendingAccounts =
    accounts.filter(
      (
        account,
      ) =>
        account.status ===
          "pending" ||
        account.status ===
          "disconnected",
    );

  // Count Celery resource synchronizations currently in flight.
  const activeSyncAccounts =
    accounts.filter(
      (
        account,
      ) =>
        account.sync_status ===
          "queued" ||
        account.sync_status ===
          "running",
    );

  // Count each account once when either connection or
  // synchronization currently reports a genuine failure.
  const attentionAccounts =
    accounts.filter(
      (
        account,
      ) =>
        account.status ===
          "error" ||
        account.sync_status ===
          "failed" ||
        account.last_validation_error !==
          null ||
        account.last_sync_error !==
          null,
    );

  // Count distinct configured discovery regions.
  const distinctRegions =
    new Set(
      accounts.flatMap(
        (
          account,
        ) =>
          account.enabled_regions,
      ),
    );

  // Derive control-plane posture from actual account state.
  const connectionPosture =
    attentionAccounts.length >
    0
      ? {
          label:
            "Connection attention required",

          description:
            `${attentionAccounts.length} AWS account${
              attentionAccounts.length ===
              1
                ? ""
                : "s"
            } currently report validation or synchronization errors.`,

          classes:
            "border-rose-400/20 bg-rose-400/8 text-rose-300",

          Icon:
            AlertTriangle,
        }
      : activeSyncAccounts.length >
          0
        ? {
            label:
              "Synchronization in progress",

            description:
              `${activeSyncAccounts.length} AWS inventory synchronization${
                activeSyncAccounts.length ===
                1
                  ? ""
                  : "s"
              } are currently queued or running.`,

            classes:
              "border-violet-400/20 bg-violet-400/8 text-violet-300",

            Icon:
              RefreshCw,
          }
        : pendingAccounts.length >
            0
          ? {
              label:
                "Validation required",

              description:
                `${pendingAccounts.length} AWS account${
                  pendingAccounts.length ===
                  1
                    ? ""
                    : "s"
                } require IAM setup, validation or reconnection before synchronization.`,

              classes:
                "border-amber-400/20 bg-amber-400/8 text-amber-300",

              Icon:
                ShieldCheck,
            }
          : accounts.length ===
              0
            ? {
                label:
                  "No AWS accounts registered",

                description:
                  "Register an AWS account to begin connectivity validation and resource discovery.",

                classes:
                  "border-sky-400/20 bg-sky-400/8 text-sky-300",

                Icon:
                  Cloud,
              }
            : connectedAccounts.length ===
                accounts.length
              ? {
                  label:
                    "AWS connections ready",

                  description:
                    "All registered AWS accounts are currently validated for provider access.",

                  classes:
                    "border-emerald-400/20 bg-emerald-400/8 text-emerald-300",

                  Icon:
                    CircleCheckBig,
                }
              : {
                  label:
                    "Review account states",

                  description:
                    "One or more registered accounts are not currently in connected state.",

                  classes:
                    "border-violet-400/20 bg-violet-400/8 text-violet-300",

                  Icon:
                    CloudCog,
                };

  // Read posture icon.
  const PostureIcon =
    connectionPosture.Icon;

  // Define genuine control-plane KPI cards.
  const metrics = [
    {
      label:
        "Registered accounts",

      value:
        String(
          accounts.length,
        ),

      helper:
        "AWS integrations",

      Icon:
        Cloud,

      iconClass:
        "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        "from-cyan-400/16 via-transparent to-transparent",
    },

    {
      label:
        "Connected",

      value:
        String(
          connectedAccounts.length,
        ),

      helper:
        "STS validated",

      Icon:
        ShieldCheck,

      iconClass:
        connectedAccounts.length >
        0
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",

      glowClass:
        connectedAccounts.length >
        0
          ? "from-emerald-400/14 via-transparent to-transparent"
          : "from-cyan-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Synchronizing",

      value:
        String(
          activeSyncAccounts.length,
        ),

      helper:
        "Queued or running",

      Icon:
        Activity,

      iconClass:
        "border-violet-400/20 bg-violet-400/10 text-violet-300",

      glowClass:
        "from-violet-400/14 via-transparent to-transparent",
    },

    {
      label:
        "Attention",

      value:
        String(
          attentionAccounts.length,
        ),

      helper:
        "Validation or sync errors",

      Icon:
        AlertTriangle,

      iconClass:
        "border-rose-400/20 bg-rose-400/10 text-rose-300",

      glowClass:
        "from-rose-400/14 via-transparent to-transparent",
    },
  ];

  // Render the cloud integration control plane.
  return (
    <section className="space-y-6">
      {/* =====================================================
          AWS integration hero
          ===================================================== */}
      <Card className="relative overflow-hidden border-primary/15 bg-card/68 py-0">
        {/* Cyan cloud atmosphere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-28 -top-40 size-[420px] rounded-full bg-cyan-400/9 blur-3xl"
        />

        {/* Violet provider depth. */}
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
              <CloudCog className="size-3.5" />

              AWS control plane
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.045em] sm:text-4xl">
              Connect and synchronize
              your AWS infrastructure.
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Register AWS account configuration, validate provider
              connectivity through STS and control synchronized resource
              discovery from one workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                className="rounded-xl border border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                onClick={() =>
                  setDialogOpen(
                    true,
                  )
                }
              >
                <Plus className="mr-2 size-4" />

                Add AWS account
              </Button>
            </div>
          </div>

          {/* Genuine cloud-connection posture. */}
          <div className="rounded-2xl border border-border/65 bg-background/30 p-4 shadow-inner backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted-foreground">
              Connection posture
            </p>

            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border p-3.5 ${connectionPosture.classes}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-current/15 bg-current/5">
                <PostureIcon className="size-[18px]" />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  {
                    connectionPosture.label
                  }
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {
                    connectionPosture.description
                  }
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border/45 rounded-xl border border-border/60 bg-card/30 px-3">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Registered
                </span>

                <span className="text-sm font-semibold">
                  {
                    accounts.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Connected
                </span>

                <span className="text-sm font-semibold">
                  {
                    connectedAccounts.length
                  }
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-xs text-muted-foreground">
                  Discovery regions
                </span>

                <span className="text-sm font-semibold">
                  {
                    distinctRegions.size
                  }
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Wifi className="size-3.5" />

              Account state refreshes automatically while synchronization runs.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* =====================================================
          Account KPI strip
          ===================================================== */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(
          (
            metric,
          ) => {
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
                    <p className="text-2xl font-semibold tracking-[-0.035em]">
                      {
                        metric.value
                      }
                    </p>

                    <p className="mt-2 text-xs text-muted-foreground">
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
          Zero-account state
          ===================================================== */}
      {accounts.length ===
        0 && (
        <Card className="bg-card/72">
          <CardContent className="flex min-h-[330px] flex-col items-center justify-center text-center">
            <div className="flex size-13 items-center justify-center rounded-2xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300">
              <Cloud className="size-5" />
            </div>

            <p className="mt-4 font-semibold">
              No AWS accounts registered
            </p>

            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Register an AWS account and validate provider access before
              CloudOps begins synchronized inventory discovery.
            </p>

            <Button
              className="mt-5 rounded-xl"
              onClick={() =>
                setDialogOpen(
                  true,
                )
              }
            >
              <Plus className="mr-2 size-4" />

              Add first AWS account
            </Button>
          </CardContent>
        </Card>
      )}

      {/* =====================================================
          Registered AWS account cards
          ===================================================== */}
      <div className="grid gap-5 xl:grid-cols-2">
        {accounts.map(
          (
            account,
          ) => {
            // Determine persisted Celery activity.
            const syncActive =
              account.sync_status ===
                "queued" ||
              account.sync_status ===
                "running";

            // Detect whether the current mutation targets this account.
            const validatingThisAccount =
              validateAccount.isPending &&
              validateAccount.variables ===
                account.id;

            const syncingThisAccount =
              syncActive ||
              (
                syncAccount.isPending &&
                syncAccount.variables ===
                  account.id
              );

            const loadingOnboardingThisAccount =
              onboardingQuery.isPending &&
              onboardingQuery.variables ===
                account.id;

            // Resolve genuine connection semantics.
            const connectionStyle =
              getConnectionStyle(
                account.status,
              );

            const ConnectionIcon =
              connectionStyle.Icon;

            // Resolve genuine Celery sync semantics.
            const syncStyle =
              getSyncStyle(
                account.sync_status,
              );

            // Render one registered account.
            return (
              <Card
                className="group overflow-hidden bg-card/72 py-0"
                key={
                  account.id
                }
              >
                <CardHeader className="border-b border-border/50 p-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="truncate">
                          {
                            account.name
                          }
                        </CardTitle>

                        <Badge
                          className={
                            connectionStyle.badge
                          }
                          variant="outline"
                        >
                          <ConnectionIcon className="mr-1.5 size-3" />

                          {
                            connectionStyle.label
                          }
                        </Badge>
                      </div>

                      <CardDescription className="mt-2 flex items-center gap-1.5">
                        <Fingerprint className="size-3.5 shrink-0" />

                        AWS account{" "}
                        <span className="font-mono">
                          {
                            account.external_account_id
                          }
                        </span>
                      </CardDescription>
                    </div>

                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/15 bg-cyan-400/8 text-cyan-300 transition-transform duration-300 group-hover:scale-110">
                      <CloudCog className="size-5" />
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-4">
                  {/* Connection and synchronization state. */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-border/55 bg-background/20 p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Connection
                      </p>

                      <div className="mt-2">
                        <Badge
                          className={
                            connectionStyle.badge
                          }
                          variant="outline"
                        >
                          {
                            connectionStyle.label
                          }
                        </Badge>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/55 bg-background/20 p-3">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Resource sync
                      </p>

                      <div className="mt-2">
                        <Badge
                          className={
                            syncStyle.badge
                          }
                          variant="outline"
                        >
                          {syncActive && (
                            <RefreshCw className="mr-1.5 size-3 animate-spin" />
                          )}

                          {
                            syncStyle.label
                          }
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* AWS discovery configuration. */}
                  <div className="rounded-xl border border-border/55 bg-background/20 p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="size-3.5 text-sky-300" />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                        Discovery regions
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {account.enabled_regions.length >
                      0 ? (
                        account.enabled_regions.map(
                          (
                            region,
                          ) => (
                            <Badge
                              className="border-sky-400/15 bg-sky-400/7 text-sky-200"
                              key={
                                region
                              }
                              variant="outline"
                            >
                              {
                                region
                              }
                            </Badge>
                          ),
                        )
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          No discovery regions configured
                        </span>
                      )}
                    </div>
                  </div>

                  {/* IAM AssumeRole configuration. */}
                  <div className="rounded-xl border border-border/55 bg-background/20 p-4">
                    <div className="flex items-center gap-2">
                      <KeyRound className="size-3.5 text-violet-300" />

                      <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
                        IAM access
                      </p>
                    </div>

                    <p className="mt-2 break-all font-mono text-xs leading-5 text-foreground">
                      {account.role_arn ??
                        "AssumeRole ARN not configured"}
                    </p>
                  </div>

                  {/* Validation and synchronization timestamps. */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Last validation
                      </p>

                      <p className="mt-1.5 text-xs font-medium">
                        {account.last_validated_at
                          ? formatTimestamp(
                              account.last_validated_at,
                            )
                          : "Never validated"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Last resource sync
                      </p>

                      <p className="mt-1.5 text-xs font-medium">
                        {account.last_synced_at
                          ? formatTimestamp(
                              account.last_synced_at,
                            )
                          : "Never synchronized"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Registered
                      </p>

                      <p className="mt-1.5 text-xs font-medium">
                        {formatTimestamp(
                          account.created_at,
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Preserve genuine validation failure detail. */}
                  {account.last_validation_error && (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.055] p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />

                        <div>
                          <p className="text-xs font-semibold text-rose-300">
                            AWS validation failed
                          </p>

                          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                            {
                              account.last_validation_error
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preserve genuine background synchronization failure detail. */}
                  {account.last_sync_error && (
                    <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.055] p-3">
                      <div className="flex items-start gap-2">
                        <ServerCog className="mt-0.5 size-4 shrink-0 text-rose-300" />

                        <div>
                          <p className="text-xs font-semibold text-rose-300">
                            Resource synchronization failed
                          </p>

                          <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                            {
                              account.last_sync_error
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {account.disconnected_at && (
                    <div className="rounded-xl border border-slate-400/15 bg-slate-400/[0.045] p-3">
                      <div className="flex items-start gap-2">
                        <Unplug className="mt-0.5 size-4 shrink-0 text-slate-300" />

                        <div>
                          <p className="text-xs font-semibold text-slate-200">
                            Integration disconnected
                          </p>

                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            CloudOps AWS access stopped{" "}
                            {formatTimestamp(
                              account.disconnected_at,
                            )}. Historical data remains available.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Existing backend actions. */}
                  <div className="flex flex-wrap gap-2 border-t border-border/45 pt-4">
                    {account.status ===
                    "connected" ? (
                      <Button
                        className="rounded-xl"
                        disabled={
                          validateAccount.isPending
                        }
                        onClick={() =>
                          void handleValidate(
                            account.id,
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        <ShieldCheck className="mr-2 size-3.5" />

                        {validatingThisAccount
                          ? "Validating..."
                          : "Revalidate"}
                      </Button>
                    ) : account.status ===
                      "removing" ? null : (
                      <Button
                        className="rounded-xl border-violet-400/20 bg-violet-400/8 text-violet-200 hover:bg-violet-400/12"
                        disabled={
                          onboardingQuery.isPending
                        }
                        onClick={() =>
                          void handleContinueSetup(
                            account.id,
                          )
                        }
                        size="sm"
                        variant="outline"
                      >
                        <KeyRound className="mr-2 size-3.5" />

                        {loadingOnboardingThisAccount
                          ? "Loading setup..."
                          : account.status ===
                              "disconnected"
                            ? "Reconnect"
                            : account.role_arn
                              ? "Review IAM setup"
                              : "Continue setup"}
                      </Button>
                    )}

                    <Button
                      className="rounded-xl"
                      disabled={
                        account.status !==
                          "connected" ||
                        syncActive ||
                        syncAccount.isPending
                      }
                      onClick={() =>
                        void handleSync(
                          account.id,
                        )
                      }
                      size="sm"
                    >
                      <RefreshCw
                        className={
                          syncingThisAccount
                            ? "mr-2 size-3.5 animate-spin"
                            : "mr-2 size-3.5"
                        }
                      />

                      {syncingThisAccount
                        ? "Synchronizing..."
                        : "Sync inventory"}
                    </Button>

                    {account.status !==
                      "disconnected" &&
                      account.status !==
                        "disconnecting" &&
                      account.status !==
                        "removing" && (
                      <Button
                        className="rounded-xl"
                        disabled={
                          disconnectCloudAccount.isPending
                        }
                        onClick={() =>
                          setDisconnectAccount(
                            account,
                          )
                        }
                        size="sm"
                        variant="destructive"
                      >
                        <Unplug className="mr-2 size-3.5" />

                        Disconnect
                      </Button>
                    )}

                    <Button
                      className="rounded-xl border-rose-400/25 text-rose-300 hover:bg-rose-400/10 hover:text-rose-200"
                      disabled={
                        removeCloudAccount.isPending
                      }
                      onClick={() =>
                        setRemoveAccount(
                          account,
                        )
                      }
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <Trash2 className="mr-2 size-3.5" />

                      {account.status ===
                      "removing"
                        ? "Retry removal"
                        : "Remove data"}
                    </Button>

                    {account.status !==
                      "connected" && (
                      <p className="self-center text-xs text-muted-foreground">
                        {account.status ===
                        "removing"
                          ? "Permanent CloudOps data removal is in progress. Retry removal if cleanup was interrupted."
                          : account.status ===
                              "disconnected"
                            ? "Historical CloudOps data is retained. Reconnect to resume AWS synchronization."
                            : "Complete IAM setup and validate AWS access before synchronization."}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          },
        )}
      </div>

      {/* Preserve genuine account registration workflow. */}
      <AwsAccountDialog
        isSaving={
          createAccount.isPending
        }
        onOpenChange={
          setDialogOpen
        }
        onSave={
          handleCreate
        }
        open={
          dialogOpen
        }
      />

      <AwsOnboardingDialog
        isSaving={
          updateAccountRole.isPending ||
          validateAccount.isPending
        }
        onboarding={
          onboardingAccount
        }
        onOpenChange={(
          nextOpen,
        ) => {
          setOnboardingOpen(
            nextOpen,
          );

          if (!nextOpen) {
            setOnboardingAccount(
              null,
            );
          }
        }}
        onSaveAndValidate={
          handleSaveRoleAndValidate
        }
        open={
          onboardingOpen
        }
      />

      <AwsDisconnectDialog
        account={
          disconnectAccount
        }
        isDisconnecting={
          disconnectCloudAccount.isPending
        }
        onConfirm={
          handleDisconnect
        }
        onOpenChange={(
          nextOpen,
        ) => {
          if (!nextOpen) {
            setDisconnectAccount(
              null,
            );
          }
        }}
        open={
          disconnectAccount !==
          null
        }
      />
      <AwsRemoveDialog
        account={
          removeAccount
        }
        key={
          removeAccount?.id ??
          "closed"
        }
        isRemoving={
          removeCloudAccount.isPending
        }
        onConfirm={
          handleRemoveIntegration
        }
        onOpenChange={(
          nextOpen,
        ) => {
          if (!nextOpen) {
            setRemoveAccount(
              null,
            );
          }
        }}
        open={
          removeAccount !==
          null
        }
      />

    </section>
  );
}

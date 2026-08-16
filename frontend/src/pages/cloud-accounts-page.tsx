// Import React state.
import {
  useState,
} from "react";

// Import page icons.
import {
  Cloud,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

// Import notifications.
import {
  toast,
} from "sonner";

// Import reusable error/loading states.
import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";

// Import UI primitives.
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

// Import AWS dialog.
import {
  AwsAccountDialog,
} from "@/features/cloud-accounts/aws-account-dialog";

import type {
  AwsAccountFormValues,
} from "@/features/cloud-accounts/aws-account-dialog";

// Import real backend operations.
import {
  useCloudAccounts,
  useCreateCloudAccount,
  useSyncCloudAccount,
  useValidateCloudAccount,
} from "@/features/cloud-accounts/api/cloud-accounts-api";

// Import timestamp helper.
import {
  formatTimestamp,
} from "@/lib/formatters";


// Export Cloud Accounts management page.
export function CloudAccountsPage() {
  // Store Add Account dialog state.
  const [
    dialogOpen,
    setDialogOpen,
  ] =
    useState(false);

  // Load registered accounts.
  const accountsQuery =
    useCloudAccounts();

  // Create account mutation.
  const createAccount =
    useCreateCloudAccount();

  // Validate AWS mutation.
  const validateAccount =
    useValidateCloudAccount();

  // Queue synchronization mutation.
  const syncAccount =
    useSyncCloudAccount();

  // Create a cloud account.
  async function handleCreate(
    values:
      AwsAccountFormValues,
  ) {
    try {
      // Register the AWS account.
      await createAccount.mutateAsync({
        name:
          values.name,
        provider:
          "aws",
        external_account_id:
          values.accountId,
        role_arn:
          values.roleArn,
        external_id:
          values.externalId,
        enabled_regions:
          values.enabledRegions,
      });

      // Confirm success.
      toast.success(
        "AWS account added.",
      );

    } catch {
      // Display failure.
      toast.error(
        "Unable to add AWS account.",
      );

      // Keep dialog open.
      throw new Error(
        "AWS account creation failed.",
      );
    }
  }

  // Validate one AWS connection.
  async function handleValidate(
    accountId: string,
  ) {
    try {
      // Run STS validation.
      await validateAccount.mutateAsync(
        accountId,
      );

      // Confirm connection.
      toast.success(
        "AWS connection validated.",
      );

    } catch {
      // Display validation failure.
      toast.error(
        "AWS connection validation failed.",
      );
    }
  }

  // Queue resource synchronization.
  async function handleSync(
    accountId: string,
  ) {
    try {
      // Queue Celery discovery.
      await syncAccount.mutateAsync(
        accountId,
      );

      // Inform user.
      toast.success(
        "AWS synchronization queued.",
      );

    } catch {
      // Display queue/provider failure.
      toast.error(
        "Unable to start AWS synchronization.",
      );
    }
  }

  // Display initial loading state.
  if (
    accountsQuery.isPending
  ) {
    return (
      <PageLoadingState />
    );
  }

  // Display backend failure.
  if (
    accountsQuery.isError
  ) {
    return (
      <PageErrorState
        title="Unable to load cloud accounts"
        description="CloudOps Insight could not retrieve registered AWS accounts."
        onRetry={() => {
          void accountsQuery.refetch();
        }}
      />
    );
  }

  // Store accounts.
  const accounts =
    accountsQuery.data;

  // Render page.
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">
            Cloud connections
          </p>

          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            AWS Accounts
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Connect AWS accounts using read-only IAM roles and
            synchronize cloud inventory.
          </p>
        </div>

        <Button
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

      {accounts.length ===
      0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Cloud className="mx-auto size-8 text-muted-foreground" />

            <p className="mt-4 font-medium">
              No AWS accounts connected
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              Add a read-only AWS account to begin resource discovery.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {accounts.map(
            (account) => {
              // Determine whether a background synchronization is active.
              const syncActive =
                account.sync_status ===
                  "queued" ||
                account.sync_status ===
                  "running";

              // Render account card.
              return (
                <Card
                  key={
                    account.id
                  }
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>
                          {
                            account.name
                          }
                        </CardTitle>

                        <CardDescription className="mt-1">
                          AWS account{" "}
                          {
                            account.external_account_id
                          }
                        </CardDescription>
                      </div>

                      <Badge
                        variant={
                          account.status ===
                          "connected"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {
                          account.status
                        }
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="grid gap-3 text-sm sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Regions
                        </p>

                        <p className="mt-1">
                          {account.enabled_regions.join(
                            ", ",
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Sync status
                        </p>

                        <p className="mt-1 capitalize">
                          {
                            account.sync_status
                          }
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Last validated
                        </p>

                        <p className="mt-1">
                          {formatTimestamp(
                            account.last_validated_at,
                          )}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">
                          Last resource sync
                        </p>

                        <p className="mt-1">
                          {formatTimestamp(
                            account.last_synced_at,
                          )}
                        </p>
                      </div>
                    </div>

                    {account.last_sync_error && (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                        {
                          account.last_sync_error
                        }
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={
                          validateAccount.isPending
                        }
                        onClick={() =>
                          void handleValidate(
                            account.id,
                          )
                        }
                      >
                        <ShieldCheck className="mr-2 size-4" />

                        Validate
                      </Button>

                      <Button
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
                      >
                        <RefreshCw
                          className={
                            syncActive
                              ? "mr-2 size-4 animate-spin"
                              : "mr-2 size-4"
                          }
                        />

                        {syncActive
                          ? "Synchronizing..."
                          : "Sync now"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>
      )}

      <AwsAccountDialog
        open={
          dialogOpen
        }
        onOpenChange={
          setDialogOpen
        }
        onSave={
          handleCreate
        }
        isSaving={
          createAccount.isPending
        }
      />
    </section>
  );
}
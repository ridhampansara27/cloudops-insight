import {
  type ReactNode,
  useEffect,
  useMemo,
} from "react";

import {
  Building2,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

import {
  useAvailableOrganizations,
} from "@/features/workspace/api/workspace-api";

import {
  useWorkspaceStore,
} from "@/features/workspace/workspace-store";

import {
  Button,
} from "@/components/ui/button";

import {
  Card,
  CardContent,
} from "@/components/ui/card";

import {
  PageErrorState,
} from "@/components/shared/page-error-state";

import {
  PageLoadingState,
} from "@/components/shared/page-loading-state";


interface WorkspaceGateProps {
  children: ReactNode;
}


export function WorkspaceGate({
  children,
}: WorkspaceGateProps) {
  const organizationsQuery =
    useAvailableOrganizations();

  const activeOrganizationId =
    useWorkspaceStore(
      (
        state,
      ) =>
        state.activeOrganizationId,
    );

  const setActiveOrganizationId =
    useWorkspaceStore(
      (
        state,
      ) =>
        state.setActiveOrganizationId,
    );


  const organizations =
    useMemo(
      () =>
        organizationsQuery.data ??
        [],
      [
        organizationsQuery.data,
      ],
    );


  const selectedOrganization =
    organizations.find(
      (
        organization,
      ) =>
        organization.id ===
        activeOrganizationId,
    );


  useEffect(
    () => {
      if (
        organizationsQuery.isPending ||
        organizationsQuery.isError
      ) {
        return;
      }

      if (
        activeOrganizationId &&
        !selectedOrganization
      ) {
        setActiveOrganizationId(
          null,
        );

        return;
      }

      if (
        !activeOrganizationId &&
        organizations.length ===
          1
      ) {
        setActiveOrganizationId(
          organizations[0].id,
        );
      }
    },
    [
      activeOrganizationId,
      organizations,
      organizationsQuery.isError,
      organizationsQuery.isPending,
      selectedOrganization,
      setActiveOrganizationId,
    ],
  );


  if (
    organizationsQuery.isPending
  ) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PageLoadingState />
      </div>
    );
  }


  if (
    organizationsQuery.isError
  ) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PageErrorState
          description="CloudOps could not load your available workspaces."
          onRetry={() => {
            void organizationsQuery.refetch();
          }}
          title="Unable to load workspaces"
        />
      </div>
    );
  }


  if (
    organizations.length ===
    0
  ) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
        <div
          aria-hidden="true"
          className="cloudops-backdrop pointer-events-none absolute inset-0"
        />

        <Card className="relative w-full max-w-xl overflow-hidden border-amber-400/15 bg-card/75 py-0 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <CardContent className="p-7 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/8 text-amber-300">
              <Building2 className="size-5" />
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-tight">
              No active workspace
            </h1>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Your account currently has no active organization membership.
              Ask a workspace owner to invite you or restore your membership.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }


  if (
    !activeOrganizationId &&
    organizations.length >
      1
  ) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background px-4 py-10 text-foreground">
        <div
          aria-hidden="true"
          className="cloudops-backdrop pointer-events-none absolute inset-0"
        />

        <div
          aria-hidden="true"
          className="cloudops-grid-mask pointer-events-none absolute inset-0"
        />

        <div className="relative mx-auto w-full max-w-4xl">
          <div className="mb-7 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-300 shadow-lg shadow-cyan-500/5">
              <Building2 className="size-5" />
            </div>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              Workspace selection
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
              Choose your CloudOps workspace
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
              Your account belongs to multiple organizations. CloudOps keeps
              operational data isolated, so select the tenant you want to
              operate before entering the command center.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {organizations.map(
              (
                organization,
              ) => (
                <Card
                  className="cloudops-interactive group overflow-hidden border-border/65 bg-card/72 py-0"
                  key={
                    organization.id
                  }
                >
                  <CardContent className="relative p-5">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-16 -top-20 size-44 rounded-full bg-cyan-400/7 blur-3xl"
                    />

                    <div className="relative flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/8 text-primary">
                        <Building2 className="size-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold">
                          {
                            organization.name
                          }
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <ShieldCheck className="size-3.5 text-emerald-300" />

                          <span className="text-xs capitalize text-muted-foreground">
                            {
                              organization.role
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      className="relative mt-5 w-full rounded-xl"
                      onClick={() =>
                        setActiveOrganizationId(
                          organization.id,
                        )
                      }
                      type="button"
                    >
                      Open workspace

                      <ChevronRight className="ml-2 size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ),
            )}
          </div>
        </div>
      </main>
    );
  }


  if (!selectedOrganization) {
    return (
      <div className="min-h-screen bg-background p-6">
        <PageLoadingState />
      </div>
    );
  }


  return children;
}
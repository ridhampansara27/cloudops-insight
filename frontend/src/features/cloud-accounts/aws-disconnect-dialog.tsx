import {
  AlertTriangle,
  Archive,
  CloudOff,
  ShieldCheck,
  WalletCards,
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

import type {
  CloudAccountApiResponse,
} from "@/types/api";


interface AwsDisconnectDialogProps {
  open: boolean;

  account:
    | CloudAccountApiResponse
    | null;

  isDisconnecting: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onConfirm: () => Promise<void>;
}


export function AwsDisconnectDialog({
  open,
  account,
  isDisconnecting,
  onOpenChange,
  onConfirm,
}: AwsDisconnectDialogProps) {
  if (!account) {
    return null;
  }

  return (
    <Dialog
      onOpenChange={(
        nextOpen,
      ) => {
        // Keep lifecycle state visible while disconnect is running.
        if (
          isDisconnecting &&
          !nextOpen
        ) {
          return;
        }

        onOpenChange(
          nextOpen,
        );
      }}
      open={
        open
      }
    >
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden border-border/70 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-rose-500/8 blur-3xl"
        />

        <DialogHeader className="relative border-b border-border/50 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/8 text-rose-300">
              <CloudOff className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                Disconnect AWS integration?
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                CloudOps will stop accessing this AWS account and invalidate
                queued synchronization work.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-border/60 bg-background/25 p-4">
            <p className="text-xs font-medium text-muted-foreground">
              Integration
            </p>

            <p className="mt-1 font-semibold">
              {account.name}
            </p>

            <p className="mt-1 font-mono text-xs text-muted-foreground">
              AWS account {account.external_account_id}
            </p>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />

              <div>
                <p className="text-sm font-semibold">
                  Your AWS resources are not deleted
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  CloudOps only disconnects its integration access. EC2,
                  databases, networking and other AWS resources remain
                  untouched in your AWS account.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-cyan-400/15 bg-cyan-400/[0.045] p-3.5">
              <Archive className="mt-0.5 size-4 shrink-0 text-cyan-300" />

              <div>
                <p className="text-sm font-semibold">
                  Historical CloudOps data is retained
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Existing inventory, costs, metrics, incidents and
                  recommendations remain available after disconnect.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.045] p-3.5">
              <WalletCards className="mt-0.5 size-4 shrink-0 text-amber-300" />

              <div>
                <p className="text-sm font-semibold">
                  Account-specific budgets stop evaluating
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Active budgets scoped specifically to this AWS account are
                  deactivated. Service and organization budgets are retained.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.055] p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />

            <p className="text-xs leading-relaxed text-muted-foreground">
              Resource, CloudWatch and Cost Explorer synchronization stops
              until this integration is explicitly reconnected and validated.
            </p>
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 bg-background/75 px-5 py-3.5 backdrop-blur-xl sm:px-6">
          <Button
            className="rounded-xl"
            disabled={
              isDisconnecting
            }
            onClick={() =>
              onOpenChange(
                false,
              )
            }
            type="button"
            variant="outline"
          >
            Keep connected
          </Button>

          <Button
            className="rounded-xl"
            disabled={
              isDisconnecting
            }
            onClick={() => {
              void onConfirm();
            }}
            type="button"
            variant="destructive"
          >
            <CloudOff className="mr-2 size-4" />

            {isDisconnecting
              ? "Disconnecting..."
              : "Disconnect AWS"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

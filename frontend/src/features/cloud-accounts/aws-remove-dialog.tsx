import {
  useState,
} from "react";

import {
  AlertTriangle,
  ArchiveX,
  ShieldCheck,
  Trash2,
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
  CloudAccountApiResponse,
} from "@/types/api";


interface AwsRemoveDialogProps {
  open: boolean;

  account:
    | CloudAccountApiResponse
    | null;

  isRemoving: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onConfirm: () => Promise<void>;
}


export function AwsRemoveDialog({
  open,
  account,
  isRemoving,
  onOpenChange,
  onConfirm,
}: AwsRemoveDialogProps) {
  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");


  if (!account) {
    return null;
  }

  const confirmed =
    confirmation ===
    "REMOVE";

  return (
    <Dialog
      onOpenChange={(
        nextOpen,
      ) => {
        // Do not allow the dialog to disappear while the destructive
        // backend transaction is still running.
        if (
          isRemoving &&
          !nextOpen
        ) {
          return;
        }

        if (!nextOpen) {
          setConfirmation(
            "",
          );
        }

        onOpenChange(
          nextOpen,
        );
      }}
      open={
        open
      }
    >
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden border-rose-400/20 bg-card/95 p-0 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:max-w-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-rose-500/10 blur-3xl"
        />

        <DialogHeader className="relative border-b border-rose-400/15 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
              <Trash2 className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                Permanently remove AWS integration?
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                This is different from disconnecting. Imported CloudOps data
                for this AWS account will be permanently deleted.
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
            <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.055] p-3.5">
              <ArchiveX className="mt-0.5 size-4 shrink-0 text-rose-300" />

              <div>
                <p className="text-sm font-semibold">
                  Imported CloudOps data will be deleted
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Resources, costs, metrics, incidents, recommendations,
                  resource tags and this CloudOps integration record are
                  permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" />

              <div>
                <p className="text-sm font-semibold">
                  Account-specific budgets are deleted
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Budgets scoped specifically to this AWS account are removed.
                  Other workspace and service budgets remain.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.045] p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />

              <div>
                <p className="text-sm font-semibold">
                  AWS resources remain untouched
                </p>

                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  CloudOps does not delete EC2 instances, databases, networking
                  or other AWS resources. The IAM role inside AWS is also not
                  deleted automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="remove-aws-confirmation"
            >
              Type REMOVE to confirm
            </label>

            <Input
              autoComplete="off"
              className="rounded-xl border-rose-400/20 bg-background/35 font-mono"
              disabled={
                isRemoving
              }
              id="remove-aws-confirmation"
              onChange={(
                event,
              ) =>
                setConfirmation(
                  event.target.value,
                )
              }
              placeholder="REMOVE"
              value={
                confirmation
              }
            />
          </div>
        </div>

        <DialogFooter className="border-t border-border/50 bg-background/75 px-5 py-3.5 backdrop-blur-xl sm:px-6">
          <Button
            className="rounded-xl"
            disabled={
              isRemoving
            }
            onClick={() =>
              onOpenChange(
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
              !confirmed ||
              isRemoving
            }
            onClick={() => {
              void onConfirm();
            }}
            type="button"
            variant="destructive"
          >
            <Trash2 className="mr-2 size-4" />

            {isRemoving
              ? "Removing..."
              : "Remove integration & data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

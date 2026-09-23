import {
  useState,
} from "react";

import {
  AlertTriangle,
  KeyRound,
  ShieldAlert,
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


interface DeleteAccountDialogProps {
  open: boolean;

  isDeleting: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;

  onConfirm: (
    currentPassword: string,
  ) => Promise<void>;
}


export function DeleteAccountDialog({
  open,
  isDeleting,
  onOpenChange,
  onConfirm,
}: DeleteAccountDialogProps) {
  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    currentPassword,
    setCurrentPassword,
  ] =
    useState("");

  function handleDialogOpenChange(
    nextOpen: boolean,
  ) {
    // Never retain sensitive destructive-confirmation state after close.
    if (
      isDeleting &&
      !nextOpen
    ) {
      return;
    }

    if (!nextOpen) {
      setConfirmation(
        "",
      );

      setCurrentPassword(
        "",
      );
    }

    onOpenChange(
      nextOpen,
    );
  }

  const confirmed =
    confirmation ===
      "DELETE" &&
    currentPassword.length >
      0;

  return (
    <Dialog
      onOpenChange={
        handleDialogOpenChange
      }
      open={
        open
      }
    >
      <DialogContent className="w-[calc(100vw-2rem)] overflow-hidden border-rose-400/25 bg-card/95 p-0 shadow-2xl shadow-black/45 backdrop-blur-2xl sm:max-w-xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-28 size-64 rounded-full bg-rose-500/12 blur-3xl"
        />

        <DialogHeader className="relative border-b border-rose-400/15 px-5 py-4 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-rose-400/25 bg-rose-400/10 text-rose-300">
              <Trash2 className="size-[18px]" />
            </div>

            <div>
              <DialogTitle>
                Delete CloudOps account?
              </DialogTitle>

              <DialogDescription className="mt-1 leading-relaxed">
                This permanently deletes your CloudOps identity and cannot be
                undone.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.055] p-3.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-300" />

            <div>
              <p className="text-sm font-semibold">
                Personal workspace data may be deleted
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Personal workspaces owned only by you are deleted together with
                their remaining CloudOps data. Cloud integrations must be
                removed first.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-3.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" />

            <div>
              <p className="text-sm font-semibold">
                Shared workspaces are protected
              </p>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Shared tenant data is retained. If you are the last active
                owner of a shared workspace, deletion is blocked until
                ownership is transferred.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
              htmlFor="delete-account-password"
            >
              <KeyRound className="size-3.5" />

              Current password
            </label>

            <Input
              autoComplete="current-password"
              className="rounded-xl bg-background/35"
              disabled={
                isDeleting
              }
              id="delete-account-password"
              maxLength={
                128
              }
              onChange={(
                event,
              ) =>
                setCurrentPassword(
                  event.target.value,
                )
              }
              type="password"
              value={
                currentPassword
              }
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="delete-account-confirmation"
            >
              Type DELETE to confirm
            </label>

            <Input
              autoComplete="off"
              className="rounded-xl border-rose-400/20 bg-background/35 font-mono"
              disabled={
                isDeleting
              }
              id="delete-account-confirmation"
              onChange={(
                event,
              ) =>
                setConfirmation(
                  event.target.value,
                )
              }
              placeholder="DELETE"
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
              isDeleting
            }
            onClick={() =>
              handleDialogOpenChange(
                false,
              )
            }
            type="button"
            variant="outline"
          >
            Keep account
          </Button>

          <Button
            className="rounded-xl"
            disabled={
              !confirmed ||
              isDeleting
            }
            onClick={() => {
              void onConfirm(
                currentPassword,
              );
            }}
            type="button"
            variant="destructive"
          >
            <Trash2 className="mr-2 size-4" />

            {isDeleting
              ? "Deleting account..."
              : "Permanently delete account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

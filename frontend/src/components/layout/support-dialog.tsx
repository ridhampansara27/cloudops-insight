import {
  ExternalLink,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
} from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


interface SupportDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;
}


// Render the in-product support surface without leaving the command center.
export function SupportDialog({
  open,
  onOpenChange,
}: SupportDialogProps) {
  return (
    <Dialog
      onOpenChange={
        onOpenChange
      }
      open={
        open
      }
    >
      <DialogContent className="overflow-hidden border-primary/20 bg-popover/95 p-0 shadow-2xl shadow-black/35 backdrop-blur-xl sm:max-w-md">
        <div className="relative overflow-hidden p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-cyan-400/10 blur-3xl"
          />

          <DialogHeader className="relative pr-8">
            <div className="mb-2 flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <LifeBuoy className="size-5" />
            </div>

            <DialogTitle className="text-xl">
              CloudOps Support
            </DialogTitle>

            <DialogDescription className="leading-6">
              Get help with CloudOps Insight access, AWS onboarding,
              workspace questions or product issues.
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-5 space-y-3">
            <a
              className="group flex items-center gap-3 rounded-xl border border-border/65 bg-background/30 p-4 transition-colors hover:border-primary/30 hover:bg-accent/35"
              href="mailto:support@cloudopsinsight.tech"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-300">
                <Mail className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Email support
                </p>

                <p className="mt-1 truncate text-xs text-muted-foreground">
                  support@cloudopsinsight.tech
                </p>
              </div>

              <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </a>

            <Link
              className="group flex items-center gap-3 rounded-xl border border-border/65 bg-background/30 p-4 transition-colors hover:border-primary/30 hover:bg-accent/35"
              onClick={() =>
                onOpenChange(
                  false,
                )
              }
              to="/contact"
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-400/8 text-violet-300">
                <LifeBuoy className="size-4" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  Contact & access requests
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Open the CloudOps contact page.
                </p>
              </div>

              <ExternalLink className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
            </Link>
          </div>

          <div className="relative mt-5 flex items-start gap-3 rounded-xl border border-emerald-400/15 bg-emerald-400/6 p-3.5">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />

            <p className="text-xs leading-5 text-muted-foreground">
              Never include AWS secret keys, passwords, session tokens or
              other credentials in a support request.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import {
  type FormEvent,
  useState,
} from "react";

import {
  CheckCircle2,
  LifeBuoy,
  LoaderCircle,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  TicketCheck,
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

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

import {
  createSupportTicket,
  type SupportCategory,
  type SupportTicketResponse,
} from "@/features/support/support-api";


interface SupportDialogProps {
  open: boolean;

  onOpenChange: (
    open: boolean,
  ) => void;
}


const SUPPORT_CATEGORY_OPTIONS:
ReadonlyArray<{
  value: SupportCategory;

  label: string;
}> = [
  {
    value:
      "bug",

    label:
      "Bug / technical issue",
  },

  {
    value:
      "aws_onboarding",

    label:
      "AWS integration / onboarding",
  },

  {
    value:
      "access",

    label:
      "Account / access",
  },

  {
    value:
      "billing",

    label:
      "Billing / subscription",
  },

  {
    value:
      "security",

    label:
      "Security concern",
  },

  {
    value:
      "other",

    label:
      "Other",
  },
];


export function SupportDialog({
  open,
  onOpenChange,
}: SupportDialogProps) {
  const [
    category,
    setCategory,
  ] =
    useState<
      SupportCategory
    >(
      "bug",
    );

  const [
    subject,
    setSubject,
  ] =
    useState("");

  const [
    message,
    setMessage,
  ] =
    useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] =
    useState(false);

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  const [
    submittedTicket,
    setSubmittedTicket,
  ] =
    useState<
      SupportTicketResponse
      | null
    >(null);


  const trimmedSubject =
    subject.trim();

  const trimmedMessage =
    message.trim();


  function resetDialog() {
    setCategory(
      "bug",
    );

    setSubject(
      "",
    );

    setMessage(
      "",
    );

    setFormError(
      null,
    );

    setSubmittedTicket(
      null,
    );

    setIsSubmitting(
      false,
    );
  }


  function handleOpenChange(
    nextOpen: boolean,
  ) {
    if (
      !nextOpen &&
      isSubmitting
    ) {
      return;
    }

    if (!nextOpen) {
      resetDialog();
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

    if (isSubmitting) {
      return;
    }

    setFormError(
      null,
    );


    if (
      trimmedSubject.length <
      5
    ) {
      setFormError(
        "Enter a subject with at least 5 characters.",
      );

      return;
    }


    if (
      trimmedMessage.length <
      10
    ) {
      setFormError(
        "Describe the issue using at least 10 characters.",
      );

      return;
    }


    setIsSubmitting(
      true,
    );

    try {
      const ticket =
        await createSupportTicket({
          category,

          subject:
            trimmedSubject,

          message:
            trimmedMessage,
        });

      setSubmittedTicket(
        ticket,
      );

    } catch (
      error
    ) {
      setFormError(
        error instanceof Error
          ? error.message
          : (
              "CloudOps could not create the support ticket. "
              + "Please try again."
            ),
      );

    } finally {
      setIsSubmitting(
        false,
      );
    }
  }


  function createAnotherTicket() {
    resetDialog();
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
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] flex-col overflow-hidden border-border/70 bg-card/96 p-0 shadow-2xl shadow-black/45 backdrop-blur-2xl sm:max-w-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-28 size-72 rounded-full bg-cyan-400/8 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-32 size-72 rounded-full bg-violet-500/8 blur-3xl"
        />


        {submittedTicket ? (
          <>
            <DialogHeader className="relative border-b border-border/50 px-5 py-5 text-left sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/20 bg-emerald-400/8 text-emerald-300">
                  <TicketCheck className="size-5" />
                </div>

                <div>
                  <DialogTitle className="text-lg">
                    Support ticket created
                  </DialogTitle>

                  <DialogDescription className="mt-1 leading-relaxed">
                    Your request has been sent to CloudOps Support.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="relative overflow-y-auto px-5 py-6 sm:px-6">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-300" />

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      Ticket received
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Keep this ticket ID for reference if you contact support again.
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-background/45 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    Ticket ID
                  </p>

                  <p className="mt-1 break-all font-mono text-sm font-semibold text-cyan-300">
                    {
                      submittedTicket.ticket_id
                    }
                  </p>
                </div>

                <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/50 bg-background/25 px-4 py-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-primary" />

                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The request was delivered to
                    {" "}
                    <span className="font-medium text-foreground">
                      support@cloudopsinsight.tech
                    </span>
                    .
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-border/50 bg-background/75 px-5 py-3.5 backdrop-blur-xl sm:px-6">
              <Button
                className="rounded-xl"
                onClick={
                  createAnotherTicket
                }
                type="button"
                variant="outline"
              >
                Create another
              </Button>

              <Button
                className="rounded-xl"
                onClick={() =>
                  handleOpenChange(
                    false,
                  )
                }
                type="button"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="relative border-b border-border/50 px-5 py-4 text-left sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/8 text-cyan-300">
                  <LifeBuoy className="size-5" />
                </div>

                <div className="min-w-0">
                  <DialogTitle className="text-lg">
                    Contact CloudOps Support
                  </DialogTitle>

                  <DialogDescription className="mt-1 leading-relaxed">
                    Create a support request for your currently selected workspace.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form
              className="relative flex min-h-0 flex-1 flex-col"
              onSubmit={
                handleSubmit
              }
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-[0.9fr_1.6fr]">
                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="support-category"
                    >
                      Category
                    </label>

                    <NativeSelect
                      className="w-full"
                      disabled={
                        isSubmitting
                      }
                      id="support-category"
                      onChange={(
                        event,
                      ) =>
                        setCategory(
                          event.target.value as SupportCategory,
                        )
                      }
                      value={
                        category
                      }
                    >
                      {SUPPORT_CATEGORY_OPTIONS.map(
                        (
                          option,
                        ) => (
                          <NativeSelectOption
                            key={
                              option.value
                            }
                            value={
                              option.value
                            }
                          >
                            {
                              option.label
                            }
                          </NativeSelectOption>
                        ),
                      )}
                    </NativeSelect>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="support-subject"
                    >
                      Subject
                    </label>

                    <Input
                      autoComplete="off"
                      className="rounded-xl bg-background/30"
                      disabled={
                        isSubmitting
                      }
                      id="support-subject"
                      maxLength={
                        160
                      }
                      onChange={(
                        event,
                      ) =>
                        setSubject(
                          event.target.value,
                        )
                      }
                      placeholder="Brief description of the issue"
                      required
                      value={
                        subject
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <label
                      className="text-xs font-medium text-muted-foreground"
                      htmlFor="support-message"
                    >
                      Describe the problem
                    </label>

                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {
                        message.length
                      }
                      {" / 4000"}
                    </span>
                  </div>

                  <div className="relative">
                    <MessageSquareText className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-muted-foreground" />

                    <textarea
                      aria-describedby="support-message-help"
                      className="min-h-40 w-full resize-y rounded-xl border border-input bg-background/30 py-3 pl-10 pr-3 text-sm leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={
                        isSubmitting
                      }
                      id="support-message"
                      maxLength={
                        4000
                      }
                      onChange={(
                        event,
                      ) =>
                        setMessage(
                          event.target.value,
                        )
                      }
                      placeholder="What happened? What did you expect? Include the affected page, resource, or workflow and any safe error message you saw."
                      required
                      value={
                        message
                      }
                    />
                  </div>

                  <p
                    className="text-[11px] leading-relaxed text-muted-foreground"
                    id="support-message-help"
                  >
                    Include enough context to reproduce the issue, but do not include credentials.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.055] px-4 py-3">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />

                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Keep credentials out of support requests
                    </p>

                    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      Never send passwords, AWS access keys, secret keys,
                      private keys, bearer tokens, session tokens, or other credentials.
                    </p>
                  </div>
                </div>

                {formError && (
                  <div
                    className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                    role="alert"
                  >
                    {
                      formError
                    }
                  </div>
                )}
              </div>

              <DialogFooter className="m-0 flex-col gap-3 rounded-none border-t border-border/50 bg-background/80 px-5 py-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <a
                  className="flex min-w-0 items-center gap-2 rounded-lg border border-border/50 bg-card/35 px-3 py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/25 hover:bg-card/60 hover:text-foreground"
                  href="mailto:support@cloudopsinsight.tech"
                >
                  <Mail className="size-3.5 shrink-0 text-primary" />

                  <span className="truncate">
                    support@cloudopsinsight.tech
                  </span>
                </a>

                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  <Button
                    className="h-9 rounded-xl px-4"
                    disabled={
                      isSubmitting
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
                    className="h-9 min-w-36 rounded-xl px-4"
                    disabled={
                      isSubmitting
                      ||
                      trimmedSubject.length <
                        5
                      ||
                      trimmedMessage.length <
                        10
                    }
                    type="submit"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />

                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />

                        Create ticket
                      </>
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
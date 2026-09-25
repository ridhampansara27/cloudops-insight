import {
  apiRequest,
} from "@/lib/api-client";


export type SupportCategory =
  | "access"
  | "aws_onboarding"
  | "billing"
  | "bug"
  | "security"
  | "other";


export interface CreateSupportTicketInput {
  category: SupportCategory;

  subject: string;

  message: string;
}


export interface SupportTicketResponse {
  ticket_id: string;

  submitted_at: string;
}


export async function createSupportTicket(
  input: CreateSupportTicketInput,
): Promise<
  SupportTicketResponse
> {
  return apiRequest<
    SupportTicketResponse
  >(
    "/api/v1/support/tickets",
    {
      method:
        "POST",

      json: {
        category:
          input.category,

        subject:
          input.subject,

        message:
          input.message,
      },
    },
  );
}
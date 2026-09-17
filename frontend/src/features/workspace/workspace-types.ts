export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";


export type WorkspaceInvitationStatus =
  | "pending"
  | "accepted"
  | "revoked"
  | "expired";


export interface WorkspaceOrganizationChoice {
  id: string;

  membership_id: string;

  name: string;

  role: WorkspaceRole;
}


export interface WorkspaceProfile {
  id: string;

  email: string;

  full_name: string;

  role: string;

  is_active: boolean;

  email_verified_at:
    | string
    | null;

  password_changed_at: string;

  created_at: string;

  updated_at: string;
}


export interface WorkspaceOrganization {
  id: string;

  name: string;

  is_active: boolean;

  current_role: WorkspaceRole;

  created_at: string;

  updated_at: string;
}


export interface WorkspaceMember {
  membership_id: string;

  user_id: string;

  email: string;

  full_name: string;

  role: WorkspaceRole;

  is_active: boolean;

  joined_at: string;
}


export interface WorkspaceInvitation {
  id: string;

  organization_id: string;

  invited_email: string;

  role: WorkspaceRole;

  status:
    WorkspaceInvitationStatus;

  invited_by_user_id: string | null;

  expires_at: string;

  accepted_at:
    | string
    | null;

  revoked_at:
    | string
    | null;

  created_at: string;
}


export interface WorkspaceInvitationAcceptance {
  organization_id: string;

  organization_name: string;

  user_id: string;

  email: string;

  role: WorkspaceRole;

  account_created: boolean;
}


export interface CreateWorkspaceInvitationInput {
  email: string;

  role: WorkspaceRole;
}


export interface AcceptWorkspaceInvitationInput {
  token: string;

  full_name: string;

  password: string;
}
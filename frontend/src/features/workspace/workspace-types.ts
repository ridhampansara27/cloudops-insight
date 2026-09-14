export type WorkspaceRole =
  | "owner"
  | "admin"
  | "member"
  | "viewer";


export interface WorkspaceOrganizationChoice {
  id: string;

  membership_id: string;

  name: string;

  role: WorkspaceRole;
}
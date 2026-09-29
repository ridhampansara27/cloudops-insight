# Security policy

## Report a vulnerability

Use this repository's GitHub private vulnerability reporting feature when available. Otherwise contact the maintainer privately through their GitHub profile. Do not open a public issue containing exploits, customer data, credentials, or live service tokens.

Include the affected commit or deployment, a minimal reproduction, security impact, and a safe contact method. Do not test against other customers or run destructive tests on the live service.

## Boundaries

- The browser has no direct AWS credentials. Customer accounts use a read-only IAM role, generated External ID, and temporary STS credentials.
- Authenticated requests resolve active workspace membership and role; tenant-owned data is scoped by organization.
- Refresh sessions use an HttpOnly cookie. Production cookie settings, CORS, signup, and email delivery are supplied by live GitOps values.
- Runtime secrets belong in external Kubernetes Secrets or encrypted Sealed Secrets, never in example files or frontend `VITE_*` values.
- CI checks dependencies and container images. The documented frontend scanner exception is in [frontend/docs/security-exceptions.md](frontend/docs/security-exceptions.md).

Consult GitOps and Argo CD to identify the deployed release. Historical EKS material is not a supported production environment.

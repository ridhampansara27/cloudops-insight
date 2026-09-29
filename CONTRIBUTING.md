# Contributing

1. Branch from current `main`; leave existing working branches intact.
2. Keep application changes separate from OCI GitOps promotion and Terraform changes.
3. Update tests and documentation for behavior changes. Add Alembic migrations for schema changes; never edit applied migration history.
4. Run the [README checks](README.md) and open a PR describing risk, migration compatibility, and verification.
5. Review image scan results and the GitOps diff before OCI promotion. An application PR does not authorize a production sync.

Use `poetry install` and `npm ci` with the committed lockfiles. Do not commit `.env`, credentials, customer data, SQL dumps, generated scheduler state, or real External IDs in sample policies. PostgreSQL integration and tenant isolation tests must use a disposable database. Authentication, tenant boundaries, account deletion, and AWS role assumption warrant security review.

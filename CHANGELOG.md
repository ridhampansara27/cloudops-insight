# Release history

This records milestones. Immutable images use `sha-<full-git-commit>` rather than semantic release tags. Git history and merged PRs contain individual changes.

## 2026-09-29 — Certified commercial-launch baseline

- Application commit: `29d8aede6537165e8cf051641c6b6f3f79709839`.
- Tenant isolation, account lifecycle, legal pages, fresh-user flow, backup/restore drill, and invitation regression certified.
- Public signup enabled through separately reviewed OCI GitOps configuration.
- GitOps revision at certification: `473ad08567eb32d8ca09c59fdeb7c9199c07e3ff`.

## Earlier development

AWS EKS hosting was retired after migration to OCI OKE. Its Terraform and GitOps material remains historical. The original backlog and roadmap in `docs/history/` retain their original status and are not current release checklists.

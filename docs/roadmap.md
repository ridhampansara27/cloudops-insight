# CloudOps Insight Roadmap

## Milestone 1 — Product foundation

- Create repositories
- Create frontend skeleton
- Create backend skeleton
- Create local PostgreSQL and Redis
- Add health endpoints
- Add application configuration

## Milestone 2 — Core product with demonstration data

- Authentication
- Dashboard
- Cloud account model
- Resource inventory
- Resource details
- Costs
- Budgets
- Incidents
- Recommendations

## Milestone 3 — AWS integration

- Read-only AWS authentication
- EC2 discovery
- RDS discovery
- ECS discovery
- ALB discovery
- S3 discovery
- CloudWatch metrics
- Cost Explorer synchronization

## Milestone 4 — Background processing

- Redis
- Celery
- Resource discovery worker
- Metrics worker
- Cost worker
- Alert worker
- Scheduled synchronization

## Milestone 5 — Container platform

- Docker
- Docker Compose
- Kind
- Kubernetes resources
- Helm chart
- Environment values

## Milestone 6 — GitOps

- GHCR
- GitHub Actions
- Argo CD
- Automatic synchronization
- Drift correction
- Git rollback
- Environment promotion

## Milestone 7 — Observability and security

- Prometheus
- Grafana
- Trivy
- NetworkPolicies
- Security contexts
- ServiceAccounts
- Audit logs

## Milestone 8 — AWS demonstration platform

- Terraform VPC
- Temporary EKS
- Automated startup
- Automated teardown
- Cleanup verification
- Portfolio documentation

# CloudOps Insight

Multi-tenant cloud inventory, monitoring, incident, and FinOps application. Customers connect AWS accounts through read-only cross-account IAM roles; the application is hosted on Oracle Cloud Infrastructure (OCI).

**Live:** [cloudopsinsight.tech](https://cloudopsinsight.tech) · **Delivery:** GitHub Actions → GHCR → reviewed GitOps → Argo CD → OKE

> The certified commercial-launch baseline is application commit `29d8aede6537165e8cf051641c6b6f3f79709839` and GitOps commit `473ad08567eb32d8ca09c59fdeb7c9199c07e3ff` (29 September 2026). Check current GitOps values and Argo CD before an operation; these identifiers are historical.

## Capabilities

- Workspaces with owner, admin, member, and viewer roles, invitations, and tenant-scoped access.
- Email verification, password reset, rotating refresh sessions, rate limiting, and account deletion.
- AWS onboarding with a generated External ID and STS `AssumeRole`; no customer access keys are stored.
- EC2, RDS, ECS, load balancer, and S3 inventory; CloudWatch metrics and Cost Explorer synchronization.
- Dashboards, budgets, incidents, recommendations, and integration disconnect/removal workflows.
- Celery Beat and Redis-backed workers; PostgreSQL for persistent application data.

## System at a glance

```mermaid
flowchart LR
    U["Browser"] --> CF["Cloudflare"]
    CF --> T["Cloudflare Tunnel"]
    subgraph OKE["OCI Frankfurt · OKE"]
      T --> F["React / NGINX"]
      F --> A["FastAPI"]
      A --> DB[("PostgreSQL · Block Volume")]
      A --> R[("Redis")]
      R --> W["Celery worker"]
      B["Celery Beat"] --> R
    end
    A --> STS["AWS STS · AssumeRole"]
    W --> STS
    STS --> C["Customer AWS read-only role"]
    classDef edge fill:#dbeafe,stroke:#2563eb,color:#172554;
    classDef compute fill:#ede9fe,stroke:#7c3aed,color:#2e1065;
    classDef data fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef aws fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    class U,CF,T edge;
    class F,A,W,B compute;
    class DB,R data;
    class STS,C aws;
```

The live values are in [`cloudops-gitops/environments/oci-dev`](https://github.com/ridhampansara27/cloudops-gitops/tree/main/environments/oci-dev), despite the historical directory name. AWS EKS **hosting** is retired; AWS **customer monitoring** remains supported. See [detailed architecture](docs/architecture.md), [GitOps](https://github.com/ridhampansara27/cloudops-gitops), and [Terraform infrastructure](https://github.com/ridhampansara27/cloudops-infrastructure).

## Repository map

| Path | Purpose |
|---|---|
| `frontend/` | React SPA, browser routes, UI, NGINX container |
| `backend/app/` | FastAPI routes, services, models, AWS adapters, Celery tasks |
| `backend/migrations/` | Alembic schema history; required for existing databases |
| `backend/tests/` | Unit, HTTP, PostgreSQL, Redis, auth, and tenant-boundary tests |
| `compose.yaml` | Local PostgreSQL, Redis, API, worker, Beat, frontend |
| `deploy/helm/`, `deploy/kind/` | Local Kind deployment; live OKE chart is in GitOps |
| `.github/workflows/ci-cd.yml` | Checks, multi-platform builds, scans, image publication, development PR |

## Versions recorded in this commit

These are locked dependencies or configured image tags, **not a live-cluster inventory**.

| Component | Version | Source |
|---|---|---|
| Python / Node.js | 3.13 / 22 | Dockerfiles and CI |
| FastAPI / SQLAlchemy / Celery | 0.141.1 / 2.0.51 / 5.6.3 | `backend/poetry.lock` |
| boto3 / Alembic | 1.43.72 / 1.19.1 | `backend/poetry.lock` |
| React / React Router | 19.2.8 / 7.18.2 | `frontend/package-lock.json` |
| Vite / TypeScript | 8.2.0 / 6.0.3 | `frontend/package-lock.json` |
| Tailwind CSS / Base UI | 4.3.3 / 1.6.0 | `frontend/package-lock.json` |
| TanStack Query / Table / ECharts | 5.101.4 / 9.1.2 / 6.1.0 | `frontend/package-lock.json` |
| PostgreSQL / Redis | `17-alpine` / `7-alpine` | `compose.yaml` and OCI GitOps values |
| Local Helm chart | 0.1.0 | `deploy/helm/cloudops-insight/Chart.yaml` |

The broad `-alpine` image tags are not immutable digests. Review the [frontend security exception](frontend/docs/security-exceptions.md) before changing React Router or its runtime mode.

## Local development on Windows

Prerequisites: Docker Desktop with Compose, Python 3.13, Poetry, Node.js 22, npm. Live AWS integration is optional for local UI and API work.

From the repository root in PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env.local
# In backend/.env, replace JWT_SECRET and AUTH_TOKEN_PEPPER with distinct
# random development values. Keep local secrets outside Git.
docker compose up -d postgres redis
Set-Location backend
poetry install
poetry run alembic upgrade head
poetry run uvicorn app.main:app --reload
```

In another PowerShell window, from the repository root:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. Liveness is `http://localhost:8000/health/live`; readiness at `/health/ready` checks PostgreSQL and Redis. The local example disables public signup; local registration also needs mail delivery configured. Production signup is independently enabled in OCI GitOps values.

To run periodic AWS sync locally, start these commands in **separate** PowerShell windows from `backend/`:

```powershell
poetry run celery -A app.tasks.celery_app:celery_app worker --loglevel=INFO --concurrency=1
```

```powershell
poetry run celery -A app.tasks.celery_app:celery_app beat --loglevel=INFO
```

Alternatively, after creating `backend/.env`, `docker compose up --build` starts the whole container stack at `http://localhost:8080`. Compose credentials and exposed development ports are not a production recipe.

## Quality checks

```powershell
# Run from backend/
poetry run ruff check app tests scripts
poetry run ruff format --check app tests scripts
poetry run pytest -v
poetry run alembic check
```

```powershell
# Run from frontend/
npm ci
npm run check
```

PostgreSQL-backed and adversarial tenant tests require a disposable test database. CI provisions one and sets `TENANT_TEST_DATABASE_URL`; never point these tests at a shared or production database.

## Delivery, rollback, and recovery

The application workflow tests code, builds and scans `linux/amd64` and `linux/arm64` images, and publishes SHA-tagged images to GHCR from `main`. It proposes a GitOps PR for Kind and historical AWS development values. OCI promotion is a **separate reviewed GitOps change**, followed by a controlled Argo CD sync. Schema migration compatibility is checked before promotion.

GitOps owns the live Helm chart, deployment and rollback. Infrastructure owns OKE, Terraform state, volume backup policy, and Object Storage. See their runbooks for the exact recovery prerequisites; database restores must first be validated in an isolated target.

Read [SECURITY.md](SECURITY.md), [CONTRIBUTING.md](CONTRIBUTING.md), and [CHANGELOG.md](CHANGELOG.md). Do not commit `.env`, AWS credentials, database dumps, or generated Celery Beat schedules.

# Architecture and trust boundaries

This describes the certified commercial-launch application. [GitOps](https://github.com/ridhampansara27/cloudops-gitops) controls the deployed Helm configuration; [infrastructure](https://github.com/ridhampansara27/cloudops-infrastructure) controls OCI resources. Verify their current revisions before operating the live system.

## Three repositories

```mermaid
flowchart TB
    APP["cloudops-insight · API, UI, tests"] -->|"SHA-tagged images"| REG["GHCR"]
    APP -->|"development image proposal"| GIT["cloudops-gitops · Helm, values, Argo CD"]
    REG -->|"image pull"| OKE["OCI OKE"]
    GIT -->|"reviewed desired state"| ARGO["Argo CD"]
    ARGO --> OKE
    INFRA["cloudops-infrastructure · Terraform"] -->|"VCN, OKE, backup storage"| OKE
    classDef source fill:#dbeafe,stroke:#2563eb,color:#172554;
    classDef delivery fill:#ede9fe,stroke:#7c3aed,color:#2e1065;
    classDef target fill:#dcfce7,stroke:#16a34a,color:#14532d;
    class APP,INFRA source;
    class REG,GIT,ARGO delivery;
    class OKE target;
```

Application CI proposes Kind and historical AWS development image changes. OCI production promotion is a separate reviewed GitOps edit and controlled Argo CD sync.

## Current request and data paths

```mermaid
flowchart LR
    B["Browser"] --> CF["Cloudflare edge"] --> T["Tunnel connector · OKE"]
    T --> N["NGINX · React SPA"]
    N -->|"/api/v1"| API["FastAPI"]
    API --> PG[("PostgreSQL · OCI Block Volume")]
    API --> REDIS[("Redis · ephemeral")]
    BEAT["Celery Beat"] --> REDIS --> WORKER["Celery worker"]
    WORKER --> PG
    API --> STS["AWS STS"]
    WORKER --> STS
    STS --> ROLE["Customer read-only role"]
    classDef public fill:#dbeafe,stroke:#2563eb,color:#172554;
    classDef service fill:#ede9fe,stroke:#7c3aed,color:#2e1065;
    classDef data fill:#dcfce7,stroke:#16a34a,color:#14532d;
    classDef outside fill:#ffedd5,stroke:#ea580c,color:#7c2d12;
    class B,CF,T public;
    class N,API,BEAT,WORKER service;
    class PG,REDIS data;
    class STS,ROLE outside;
```

The OCI values disable application ingress, autoscaling, and NetworkPolicy. This single-worker OKE deployment is not highly available or network-policy enforced. Redis is ephemeral. PostgreSQL has persistent OCI Block Volume storage and separate logical and volume backup layers.

## AWS cross-account access

```mermaid
sequenceDiagram
    participant U as Customer admin
    participant A as CloudOps API
    participant D as Tenant-scoped database
    participant S as AWS STS
    participant R as Customer read-only role
    U->>A: Register AWS account
    A->>D: Store account and generated External ID
    A-->>U: Show trust policy
    U->>R: Configure trust and read-only permissions
    A->>S: AssumeRole(role ARN, External ID)
    S->>R: Check trust conditions
    R-->>A: Temporary credentials
    A->>D: Store tenant-owned inventory and costs
```

The session factory requires both role ARN and External ID; it does not fall back to platform credentials for customer discovery. Browser code never receives AWS credentials. Example policies in `docs/aws/` are templates, not proof of any customer's actual permissions.

## Multi-tenant authorization

```mermaid
flowchart TB
    JWT["Authenticated access token"] --> MEMBER["Active user membership"]
    HEADER["Optional X-Organization-ID"] --> MEMBER
    MEMBER --> CTX["TenantContext: organization · membership · user · role"]
    CTX --> ROUTE["Role-gated API route"]
    ROUTE --> QUERY["Organization-scoped query"]
    QUERY --> OWNED[("Tenant-owned accounts · resources · costs · incidents")]
    classDef identity fill:#dbeafe,stroke:#2563eb,color:#172554;
    classDef gate fill:#fef3c7,stroke:#d97706,color:#78350f;
    classDef data fill:#dcfce7,stroke:#16a34a,color:#14532d;
    class JWT,HEADER identity;
    class MEMBER,CTX,ROUTE,QUERY gate;
    class OWNED data;
```

Membership is checked for the selected organization. Roles are owner, admin, member, and viewer. Services and repositories scope owned records by organization ID, backed by tenant ownership migrations and HTTP/PostgreSQL regression tests. This describes application-layer isolation; it does not assert PostgreSQL row-level security.

## Lifecycle, recovery, and history

The backend implements account deletion, AWS disconnect with historical data retained, and AWS integration removal with imported data cleanup. Alembic owns schema history; never remove an applied migration.

OCI GitOps configures daily PostgreSQL logical dumps to Object Storage using a scoped upload credential. Terraform separately assigns a Block Volume backup policy and manages the bucket lifecycle. Restore requires an isolated target and verified backup. Rolling back an image does not reverse a schema migration or restore data; detailed procedures belong in GitOps and infrastructure runbooks.

The former EKS environment and ALB are historical hosting assets. OCI OKE plus Cloudflare Tunnel is the current host. AWS remains a monitored provider through customer-controlled cross-account roles. The OCI Argo CD root selects `argocd/oci-applications`, not the historical AWS application directory.

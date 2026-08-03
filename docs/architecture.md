# CloudOps Insight Architecture

## Purpose

CloudOps Insight is a cloud resource monitoring, FinOps and incident
management platform. The first implementation supports AWS.

## Main components

1. React frontend
2. FastAPI backend
3. PostgreSQL database
4. Redis queue and cache
5. Background workers
6. AWS provider adapters
7. Kubernetes deployment
8. Argo CD GitOps delivery
9. Prometheus and Grafana observability

## Application flow

User
  -> React frontend
  -> FastAPI backend
  -> PostgreSQL

FastAPI backend
  -> Redis
  -> Background workers
  -> AWS APIs

Background workers
  -> Resource discovery
  -> CloudWatch metrics
  -> Cost Explorer data
  -> Incident and recommendation processing

## First supported AWS services

- EC2
- RDS
- ECS
- Application Load Balancer
- S3

## Environment strategy

- Local development: Docker Compose
- Local Kubernetes: Kind
- GitOps environments: development, staging and production namespaces
- Public demonstration: temporary AWS EKS environment

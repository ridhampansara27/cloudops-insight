# Import asynchronous execution support.
import asyncio

# Import timezone-aware date/time utilities.
from datetime import UTC, datetime, timedelta

# Import Decimal for accurate financial values.
from decimal import Decimal

# Import SQLAlchemy select.
from sqlalchemy import select

# Import database session factory.
from app.db.session import async_session_factory

# Import ORM models.
from app.models.budget import Budget
from app.models.cloud_account import CloudAccount
from app.models.cost import CostRecord
from app.models.incident import Incident
from app.models.recommendation import Recommendation
from app.models.resource import CloudResource, ResourceTag
from app.models.user import User


# Seed realistic CloudOps demonstration information.
async def seed_demo_data() -> None:
    # Create one asynchronous database session.
    async with async_session_factory() as session:
        # Find the existing administrator.
        admin_result = await session.execute(
            select(
                User,
            ).where(
                User.role == "admin",
            ),
        )

        # Retrieve the first administrator.
        admin = admin_result.scalars().first()

        # Require Step 196 to have been completed.
        if admin is None:
            raise RuntimeError(
                "No administrator exists. Run scripts.seed_admin first.",
            )

        # Check whether demo data was already created.
        existing_result = await session.execute(
            select(
                CloudAccount,
            ).where(
                CloudAccount.external_account_id == "123456789012",
            ),
        )

        # Retrieve an existing demo account.
        existing_account = existing_result.scalar_one_or_none()

        # Keep the seed operation idempotent.
        if existing_account is not None:
            print(
                "Demo data already exists.",
            )
            return

        # Capture current UTC time.
        now = datetime.now(
            UTC,
        )

        # Create the demonstration AWS account.
        account = CloudAccount(
            provider="aws",
            name="CloudOps Demo AWS",
            external_account_id="123456789012",
            role_arn=("arn:aws:iam::123456789012:role/CloudOpsReadOnlyRole"),
            external_id=None,
            enabled_regions=[
                "eu-central-1",
                "eu-west-1",
            ],
            status="connected",
            last_synced_at=now,
            created_by_id=admin.id,
        )

        # Add the account.
        session.add(
            account,
        )

        # Flush so its UUID becomes available.
        await session.flush()

        # Create an EC2 application server.
        prod_api = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="i-0abc123prodapi",
            arn=("arn:aws:ec2:eu-central-1:123456789012:instance/i-0abc123prodapi"),
            name="cloudops-prod-api",
            service="EC2",
            resource_type="AWS::EC2::Instance",
            region="eu-central-1",
            availability_zone="eu-central-1a",
            environment="production",
            owner="Platform Team",
            cloud_state="running",
            health_state="healthy",
            resource_metadata={
                "instance_type": "t3.medium",
                "platform": "linux",
            },
            first_seen_at=now
            - timedelta(
                days=45,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Create an RDS database.
        prod_db = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="cloudops-prod-postgres",
            arn=("arn:aws:rds:eu-central-1:123456789012:db:cloudops-prod-postgres"),
            name="cloudops-prod-postgres",
            service="RDS",
            resource_type="AWS::RDS::DBInstance",
            region="eu-central-1",
            availability_zone="eu-central-1b",
            environment="production",
            owner="Platform Team",
            cloud_state="available",
            health_state="warning",
            resource_metadata={
                "instance_class": "db.t3.medium",
                "engine": "postgres",
            },
            first_seen_at=now
            - timedelta(
                days=45,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Create an analytics EC2 worker.
        analytics_worker = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="i-0analyticsworker",
            arn=None,
            name="analytics-worker-01",
            service="EC2",
            resource_type="AWS::EC2::Instance",
            region="eu-central-1",
            availability_zone="eu-central-1a",
            environment="production",
            owner="Data Team",
            cloud_state="running",
            health_state="critical",
            resource_metadata={
                "instance_type": "t3.large",
            },
            first_seen_at=now
            - timedelta(
                days=30,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Create an Application Load Balancer.
        load_balancer = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="app/cloudops-public-alb/demo123",
            arn=None,
            name="cloudops-public-alb",
            service="ELB",
            resource_type=("AWS::ElasticLoadBalancingV2::LoadBalancer"),
            region="eu-central-1",
            availability_zone=None,
            environment="production",
            owner="Platform Team",
            cloud_state="active",
            health_state="warning",
            resource_metadata={
                "type": "application",
                "scheme": "internet-facing",
            },
            first_seen_at=now
            - timedelta(
                days=40,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Create an S3 bucket.
        assets_bucket = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="cloudops-assets-demo",
            arn="arn:aws:s3:::cloudops-assets-demo",
            name="cloudops-assets",
            service="S3",
            resource_type="AWS::S3::Bucket",
            region="eu-central-1",
            availability_zone=None,
            environment="production",
            owner="Platform Team",
            cloud_state="available",
            health_state="healthy",
            resource_metadata={
                "versioning": True,
            },
            first_seen_at=now
            - timedelta(
                days=60,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Create a stopped development EC2 instance.
        dev_api = CloudResource(
            cloud_account_id=account.id,
            provider_resource_id="i-0devapi",
            arn=None,
            name="cloudops-dev-api",
            service="EC2",
            resource_type="AWS::EC2::Instance",
            region="eu-central-1",
            availability_zone="eu-central-1a",
            environment="development",
            owner="Platform Team",
            cloud_state="stopped",
            health_state="healthy",
            resource_metadata={
                "instance_type": "t3.small",
            },
            first_seen_at=now
            - timedelta(
                days=20,
            ),
            last_seen_at=now,
            last_synced_at=now,
        )

        # Add all discovered resources.
        session.add_all(
            [
                prod_api,
                prod_db,
                analytics_worker,
                load_balancer,
                assets_bucket,
                dev_api,
            ],
        )

        # Generate their UUIDs before creating dependent records.
        await session.flush()

        # Add representative provider tags.
        session.add_all(
            [
                ResourceTag(
                    resource_id=prod_api.id,
                    key="Environment",
                    value="production",
                ),
                ResourceTag(
                    resource_id=prod_api.id,
                    key="ManagedBy",
                    value="terraform",
                ),
                ResourceTag(
                    resource_id=prod_db.id,
                    key="Environment",
                    value="production",
                ),
                ResourceTag(
                    resource_id=dev_api.id,
                    key="Environment",
                    value="development",
                ),
            ],
        )

        # Define seven days of demonstration costs.
        daily_costs = [
            Decimal("43.28"),
            Decimal("46.15"),
            Decimal("47.61"),
            Decimal("44.92"),
            Decimal("49.23"),
            Decimal("48.84"),
            Decimal("51.36"),
        ]

        # Determine today's date once using an explicit UTC timezone.
        today = datetime.now(
            UTC,
        ).date()

        # Build daily cost records.
        for index, daily_amount in enumerate(
            daily_costs,
        ):
            # Calculate the billing date relative to today.
            usage_date = today - timedelta(
                days=6 - index,
            )

            # Add EC2 spending.
            session.add(
                CostRecord(
                    cloud_account_id=account.id,
                    resource_id=prod_api.id,
                    usage_date=usage_date,
                    service="Amazon EC2",
                    cost_type="direct",
                    amount=(daily_amount * Decimal("0.35")),
                    currency="USD",
                    is_estimated=False,
                ),
            )

            # Add RDS spending.
            session.add(
                CostRecord(
                    cloud_account_id=account.id,
                    resource_id=prod_db.id,
                    usage_date=usage_date,
                    service="Amazon RDS",
                    cost_type="direct",
                    amount=(daily_amount * Decimal("0.45")),
                    currency="USD",
                    is_estimated=False,
                ),
            )

            # Add remaining shared services.
            session.add(
                CostRecord(
                    cloud_account_id=account.id,
                    resource_id=None,
                    usage_date=usage_date,
                    service="Other",
                    cost_type="direct",
                    amount=(daily_amount * Decimal("0.20")),
                    currency="USD",
                    is_estimated=False,
                ),
            )

        # Create an account-level budget.
        session.add(
            Budget(
                name="AWS Monthly Budget",
                scope_type="account",
                scope_value=(account.external_account_id),
                monthly_limit=Decimal(
                    "650.00",
                ),
                warning_threshold=80,
                critical_threshold=100,
                is_active=True,
                created_by_id=admin.id,
            ),
        )

        # Create a critical CPU incident.
        session.add(
            Incident(
                resource_id=analytics_worker.id,
                severity="critical",
                title=("Sustained CPU utilization above 90%"),
                description=(
                    "Average CPU utilization remained above the configured threshold."
                ),
                status="investigating",
                started_at=now
                - timedelta(
                    hours=3,
                ),
                assigned_user_id=admin.id,
            ),
        )

        # Create an RDS connection incident.
        session.add(
            Incident(
                resource_id=prod_db.id,
                severity="high",
                title=("Database connections approaching limit"),
                description=(
                    "RDS connection utilization exceeded the warning threshold."
                ),
                status="acknowledged",
                started_at=now
                - timedelta(
                    hours=6,
                ),
                acknowledged_at=now
                - timedelta(
                    hours=5,
                    minutes=45,
                ),
                assigned_user_id=admin.id,
            ),
        )

        # Create an EC2 right-sizing recommendation.
        session.add(
            Recommendation(
                resource_id=prod_api.id,
                recommendation_type="rightsizing",
                title=("Downsize underutilized EC2 instance"),
                description=(
                    "Average compute utilization indicates "
                    "that a smaller instance can be evaluated."
                ),
                evidence=("Seven-day average CPU utilization remains below 10%."),
                estimated_monthly_savings=Decimal(
                    "21.40",
                ),
                risk="medium",
                confidence="high",
                status="open",
            ),
        )

        # Create a scheduling recommendation.
        session.add(
            Recommendation(
                resource_id=dev_api.id,
                recommendation_type="scheduling",
                title=("Stop development EC2 outside working hours"),
                description=(
                    "Schedule the development instance "
                    "around active development periods."
                ),
                evidence=("The instance has no production traffic."),
                estimated_monthly_savings=Decimal(
                    "18.70",
                ),
                risk="low",
                confidence="high",
                status="open",
            ),
        )

        # Persist the complete demonstration dataset.
        await session.commit()

        # Confirm successful completion.
        print(
            "CloudOps demo data created successfully.",
        )


# Run the asynchronous seed operation.
if __name__ == "__main__":
    asyncio.run(
        seed_demo_data(),
    )

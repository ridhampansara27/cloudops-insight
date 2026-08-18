# Import cloud resource ORM model.
from app.models.resource import CloudResource

# Import CloudWatch metric contract.
from app.providers.aws.monitoring_types import AwsMetricQuery


# Extract the CloudWatch LoadBalancer dimension from an ALB ARN.
def get_alb_dimension(
    arn: str | None,
) -> str | None:
    # Return no dimension when there is no ARN.
    if arn is None:
        return None

    # CloudWatch expects the ARN suffix after "loadbalancer/".
    marker = "loadbalancer/"

    # Reject malformed ARNs.
    if marker not in arn:
        return None

    # Return values such as app/my-alb/1234567890abcdef.
    return arn.split(
        marker,
        maxsplit=1,
    )[1]


# Build CloudWatch queries appropriate for one discovered resource.
def build_metric_queries(
    resource: CloudResource,
) -> list[AwsMetricQuery]:
    # Store resource-specific metric queries.
    queries: list[AwsMetricQuery] = []

    # Configure EC2 instance monitoring.
    if resource.service == "EC2" and resource.resource_type == "AWS::EC2::Instance":
        # Retrieve average EC2 CPU utilization.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/EC2",
                metric_name="CPUUtilization",
                statistic="Average",
                dimensions=(
                    (
                        "InstanceId",
                        resource.provider_resource_id,
                    ),
                ),
                unit="Percent",
            ),
        )

        # Retrieve incoming network bytes.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/EC2",
                metric_name="NetworkIn",
                statistic="Sum",
                dimensions=(
                    (
                        "InstanceId",
                        resource.provider_resource_id,
                    ),
                ),
                unit="Bytes",
            ),
        )

        # Retrieve outgoing network bytes.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/EC2",
                metric_name="NetworkOut",
                statistic="Sum",
                dimensions=(
                    (
                        "InstanceId",
                        resource.provider_resource_id,
                    ),
                ),
                unit="Bytes",
            ),
        )

    # Configure RDS instance monitoring.
    if resource.service == "RDS" and resource.resource_type == "AWS::RDS::DBInstance":
        # Use the provider-native DB instance identifier.
        db_identifier = resource.provider_resource_id

        # Retrieve RDS CPU utilization.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/RDS",
                metric_name="CPUUtilization",
                statistic="Average",
                dimensions=(
                    (
                        "DBInstanceIdentifier",
                        db_identifier,
                    ),
                ),
                unit="Percent",
            ),
        )

        # Retrieve average database connections.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/RDS",
                metric_name="DatabaseConnections",
                statistic="Average",
                dimensions=(
                    (
                        "DBInstanceIdentifier",
                        db_identifier,
                    ),
                ),
                unit="Count",
            ),
        )

        # Retrieve available database storage.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/RDS",
                metric_name="FreeStorageSpace",
                statistic="Average",
                dimensions=(
                    (
                        "DBInstanceIdentifier",
                        db_identifier,
                    ),
                ),
                unit="Bytes",
            ),
        )

    # Configure Application Load Balancer monitoring.
    if (
        resource.service == "ELB"
        and resource.resource_type == "AWS::ElasticLoadBalancingV2::LoadBalancer"
        and resource.resource_metadata.get("type") == "application"
    ):
        # Derive CloudWatch's expected LoadBalancer dimension.
        load_balancer_dimension = get_alb_dimension(
            resource.arn,
        )

        # Skip malformed load balancer records.
        if load_balancer_dimension is None:
            return queries

        # Retrieve processed request count.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/ApplicationELB",
                metric_name="RequestCount",
                statistic="Sum",
                dimensions=(
                    (
                        "LoadBalancer",
                        load_balancer_dimension,
                    ),
                ),
                unit="Count",
            ),
        )

        # Retrieve average backend response time.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/ApplicationELB",
                metric_name="TargetResponseTime",
                statistic="Average",
                dimensions=(
                    (
                        "LoadBalancer",
                        load_balancer_dimension,
                    ),
                ),
                unit="Seconds",
            ),
        )

        # Retrieve target-generated HTTP 5xx errors.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/ApplicationELB",
                metric_name="HTTPCode_Target_5XX_Count",
                statistic="Sum",
                dimensions=(
                    (
                        "LoadBalancer",
                        load_balancer_dimension,
                    ),
                ),
                unit="Count",
            ),
        )

    # Configure ECS service monitoring.
    if resource.service == "ECS" and resource.resource_type == "AWS::ECS::Service":
        # Read the cluster discovered by the ECS provider.
        cluster_name = resource.resource_metadata.get(
            "cluster_name",
        )

        # Ensure metadata contains a usable cluster name.
        if not isinstance(
            cluster_name,
            str,
        ):
            return queries

        # Retrieve service CPU utilization.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/ECS",
                metric_name="CPUUtilization",
                statistic="Average",
                dimensions=(
                    (
                        "ClusterName",
                        cluster_name,
                    ),
                    (
                        "ServiceName",
                        resource.name,
                    ),
                ),
                unit="Percent",
            ),
        )

        # Retrieve service memory utilization.
        queries.append(
            AwsMetricQuery(
                resource_id=resource.id,
                namespace="AWS/ECS",
                metric_name="MemoryUtilization",
                statistic="Average",
                dimensions=(
                    (
                        "ClusterName",
                        cluster_name,
                    ),
                    (
                        "ServiceName",
                        resource.name,
                    ),
                ),
                unit="Percent",
            ),
        )

        # ECS service configuration is complete.
        return queries

    # S3 and unsupported resources currently have no standard metrics configured.
    return queries

    # Return all monitoring queries configured for this resource.
    return queries

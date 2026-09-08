// ------------------------------
// Cloud Accounts
// ------------------------------

// Define one registered cloud account.
export interface CloudAccountApiResponse {
  // Store CloudOps UUID.
  id: string;

  // Store provider.
  provider: string;

  // Store visible account name.
  name: string;

  // Store provider-native AWS account ID.
  external_account_id: string;

  // Store AssumeRole ARN when configured.
  role_arn:
    | string
    | null;

  // Store enabled discovery regions.
  enabled_regions: string[];

  // Store AWS connection validation state.
  status: string;

  // Store latest successful inventory sync.
  last_synced_at:
    | string
    | null;

  // Store latest validation attempt.
  last_validated_at:
    | string
    | null;

  // Store safe validation error.
  last_validation_error:
    | string
    | null;

  // Store background synchronization state.
  sync_status: string;

  // Store latest synchronization start time.
  sync_started_at:
    | string
    | null;

  // Store safe synchronization error.
  last_sync_error:
    | string
    | null;

  // Store creation timestamp.
  created_at: string;

  // Store modification timestamp.
  updated_at: string;
}


// Define queued synchronization response.
export interface CloudAccountSyncQueuedResponse {
  // Store account UUID.
  account_id: string;

  // Store Celery task identifier.
  task_id: string;

  // Store queue status.
  status: string;
}






// ------------------------------
// Dashboard
// ------------------------------

// Import existing resource-domain unions.
import type {
  ResourceEnvironment,
  ResourceHealth,
} from "@/types/resource";

// Define backend dashboard KPIs.
export interface DashboardSummaryResponse {
  // Return total discovered resources.
  total_resources: number;

  // Return healthy resources.
  healthy_resources: number;

  // Return warning resources.
  warning_resources: number;

  // Return critical resources.
  critical_resources: number;

  // Return unresolved incidents.
  active_incidents: number;

  // Return current-month cloud cost.
  month_to_date_cost: number;

  // Return open optimization savings.
  potential_monthly_savings: number;

  // Return billing currency.
  currency: string;

  // Return the latest completed AWS inventory synchronization.
  last_resource_sync_at:
    | string
    | null;
}


// ------------------------------
// Resources
// ------------------------------

// Define one resource returned by FastAPI.
export interface ResourceApiResponse {
  // Store CloudOps UUID.
  id: string;

  // Store owning cloud account UUID.
  cloud_account_id: string;

  // Store provider-native identifier.
  provider_resource_id: string;

  // Store ARN when available.
  arn: string | null;

  // Store visible resource name.
  name: string;

  // Store AWS service.
  service: string;

  // Store provider-specific resource type.
  resource_type: string;

  // Store AWS region.
  region: string;

  // Store availability zone.
  availability_zone:
    | string
    | null;

  // Store the normalized deployment environment when available.
  environment:
    | ResourceEnvironment
    | null;

  // Store owner.
  owner:
    | string
    | null;

  // Store native cloud state.
  cloud_state: string;

  // Store CloudOps health.
  health_state: ResourceHealth;

  // Store provider metadata.
  resource_metadata:
    Record<
      string,
      unknown
    >;

  // Store provider observation time.
  last_seen_at:
    | string
    | null;

  // Store synchronization time.
  last_synced_at:
    | string
    | null;
}

// Define paginated resources.
export interface ResourceListResponse {
  // Store current page records.
  items:
    ResourceApiResponse[];

  // Store total matching records.
  total: number;

  // Store one-based page.
  page: number;

  // Store page size.
  page_size: number;

  // Store total page count.
  total_pages: number;
}


// ------------------------------
// Costs
// ------------------------------

export interface ServiceCostApiResponse {
  // Store service name.
  service: string;

  // Store aggregated spending.
  amount: number;
}

export interface DailyCostApiResponse {
  // Store ISO billing date.
  date: string;

  // Store daily spending.
  amount: number;
}

export interface CostSummaryApiResponse {
  // Store month-to-date spending.
  month_to_date: number;

  // Store service breakdown.
  by_service:
    ServiceCostApiResponse[];

  // Store daily spending.
  daily:
    DailyCostApiResponse[];

  // Store billing currency.
  currency: string;

  // Tell the UI whether mapped resource-level billing data exists.
  resource_level_available: boolean;
}


// ------------------------------
// Budgets
// ------------------------------

export interface BudgetApiResponse {
  id: string;
  name: string;
  scope_type: string;
  scope_value: string;
  // Pydantic Decimal values may need numeric normalization in the frontend.
  monthly_limit:
    | number
    | string;
  warning_threshold: number;
  critical_threshold: number;
  is_active: boolean;

  // Store genuine backend-calculated month-to-date spend.
  current_spend:
    | number
    | string;

  // Store genuine backend-calculated utilization.
  utilization_percentage:
    | number
    | string;

  // Store healthy, warning, critical, or unsupported.
  evaluation_status: string;

  // Store the latest backend budget evaluation time.
  last_evaluated_at:
    | string
    | null;

  created_at: string;
  updated_at: string;
}


// ------------------------------
// Incidents
// ------------------------------

export interface IncidentApiResponse {
  id: string;
  resource_id: string;
  severity: string;
  title: string;
  description:
    | string
    | null;
  status: string;
  started_at: string;
  acknowledged_at:
    | string
    | null;
  resolved_at:
    | string
    | null;
}


// ------------------------------
// Recommendations
// ------------------------------

export interface RecommendationApiResponse {
  id: string;
  resource_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  evidence: string;
  // Support backend decimal serialization safely.
  estimated_monthly_savings:
    | number
    | string
    | null;
  risk: string;
  confidence: string;
  status: string;
  created_at: string;
}





// ------------------------------
// Monitoring
// ------------------------------

// Define one CloudWatch metric point.
export interface MetricPointApiResponse {
  // Store provider timestamp.
  timestamp: string;

  // Store numeric metric value.
  value: number;
}

// Define one complete CloudWatch series.
export interface MetricSeriesApiResponse {
  // Store provider namespace.
  namespace: string;

  // Store metric name.
  metric_name: string;

  // Store statistic.
  statistic: string;

  // Store unit.
  unit:
    | string
    | null;

  // Store chronological metric points.
  points:
    MetricPointApiResponse[];
}

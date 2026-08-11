// Define optimization risk.
export type RecommendationRisk =
  | "low"
  | "medium"
  | "high";

// Define recommendation confidence.
export type RecommendationConfidence =
  | "high"
  | "medium"
  | "low";

// Define recommendation workflow state.
export type RecommendationStatus =
  | "open"
  | "accepted"
  | "dismissed"
  | "resolved";

// Define one FinOps recommendation.
export interface Recommendation {
  // Store recommendation identifier.
  id: string;

  // Display recommendation title.
  title: string;

  // Explain why it was generated.
  description: string;

  // Identify affected resource.
  resourceName: string;

  // Identify cloud service.
  service: string;

  // Store estimated monthly saving.
  estimatedMonthlySavings: number;

  // Store risk classification.
  risk: RecommendationRisk;

  // Store confidence level.
  confidence: RecommendationConfidence;

  // Store workflow state.
  status: RecommendationStatus;

  // Explain the evidence behind the rule.
  evidence: string;
}
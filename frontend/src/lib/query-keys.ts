// Define stable query keys used throughout CloudOps Insight.
export const queryKeys = {
  // Store current-user cache key.
  currentUser: [
    "auth",
    "current-user",
  ] as const,


  // Store cloud-account queries.
  cloudAccounts: {
    // Store the complete cloud-account list.
    all: [
      "cloud-accounts",
    ] as const,
  },

  // Store dashboard cache keys.
  dashboard: {
    // Store dashboard summary.
    summary: [
      "dashboard",
      "summary",
    ] as const,
  },

  // Store resource cache keys.
  resources: {
    // Root key for resource inventory.
    all: [
      "resources",
    ] as const,

    // Create a list key containing its filter parameters.
    list: (
      filters: unknown,
    ) =>
      [
        "resources",
        "list",
        filters,
      ] as const,

    // Create one resource-detail key.
    detail: (
      resourceId: string,
    ) =>
      [
        "resources",
        "detail",
        resourceId,
      ] as const,
     
    // Create a resource monitoring query key.
    metrics: (
      resourceId: string,
      hours: number,
    ) =>
      [
        "resources",
        "metrics",
        resourceId,
        hours,
      ] as const,  
  },

  // Store cost cache keys.
  costs: {
    // Store cost summary.
    summary: [
      "costs",
      "summary",
    ] as const,
  },

  // Store budget cache keys.
  budgets: [
    "budgets",
  ] as const,

  // Store incident cache keys.
  incidents: [
    "incidents",
  ] as const,

  // Store recommendation cache keys.
  recommendations: [
    "recommendations",
  ] as const,
};
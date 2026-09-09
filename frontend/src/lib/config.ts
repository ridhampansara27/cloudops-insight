// Define the application's validated runtime configuration.
export const appConfig = {
  // Read the visible application name.
  appName: import.meta.env.VITE_APP_NAME || "CloudOps Insight",

  // Read the backend API base URL.
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:8000/api/v1",

  // Read the real-time event stream URL.
  eventsUrl:
    import.meta.env.VITE_EVENTS_URL ||
    "http://localhost:8000/api/v1/events",

  // Read the current application environment.
  environment:
    import.meta.env.VITE_APP_ENV || "development",
} as const;
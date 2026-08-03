/// <reference types="vite/client" />

// Extend Vite's environment-variable type definition.
interface ImportMetaEnv {
  // Define the application display name.
  readonly VITE_APP_NAME: string;

  // Define the backend API base URL.
  readonly VITE_API_BASE_URL: string;

  // Define the server-sent events URL.
  readonly VITE_EVENTS_URL: string;

  // Define whether mock API responses are enabled.
  readonly VITE_ENABLE_MOCKS: string;

  // Define the visible deployment environment.
  readonly VITE_APP_ENV: string;
}

// Extend the global ImportMeta interface.
interface ImportMeta {
  // Expose the typed Vite environment object.
  readonly env: ImportMetaEnv;
}
// Import React's strict-development mode.
import { StrictMode } from "react";

// Import React's DOM renderer.
import { createRoot } from "react-dom/client";

// Import React Router's provider.
import { RouterProvider } from "react-router-dom";

// Import the global stylesheet.
import "@/index.css";

// Import the global provider composition.
import { AppProviders } from "@/providers/app-providers";

// Import the application route configuration.
import { appRouter } from "@/routes/app-router";

// Find the HTML element where React should mount.
const rootElement = document.getElementById("root");

// Fail clearly if the root element is missing.
if (!rootElement) {
  throw new Error(
    "The application root element could not be found.",
  );
}

// Create the React root and render the application.
createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={appRouter} />
    </AppProviders>
  </StrictMode>,
);
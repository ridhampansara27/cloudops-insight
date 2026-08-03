// Import Node's path utilities for resolving the source-directory alias.
import path from "node:path";

// Import React's official Vite plugin.
import react from "@vitejs/plugin-react";

// Import Tailwind CSS's official Vite plugin.
import tailwindcss from "@tailwindcss/vite";

// Import Vite's typed configuration helper.
import { defineConfig } from "vite";

// Export the Vite configuration.
export default defineConfig({
  // Register React and Tailwind CSS with Vite.
  plugins: [
    // Enable React Fast Refresh and JSX transformation.
    react(),

    // Enable Tailwind CSS processing.
    tailwindcss(),
  ],

  // Configure import aliases.
  resolve: {
    alias: {
      // Allow imports such as "@/components/ui/button".
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  // Configure the local development server.
  server: {
    // Use the standard frontend development port.
    port: 5173,

    // Fail instead of silently selecting another port.
    strictPort: true,

    // Allow access from Docker and local network environments.
    host: true,
  },

  // Configure the production preview server.
  preview: {
    // Use a separate predictable preview port.
    port: 4173,

    // Fail when the requested preview port is unavailable.
    strictPort: true,

    // Allow preview access from container environments.
    host: true,
  },
});
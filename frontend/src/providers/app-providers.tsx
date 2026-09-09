// Import the TanStack Query provider.
import { QueryClientProvider } from "@tanstack/react-query";

// Import React's children type.
import type { PropsWithChildren } from "react";

// Import the notification component.
import { Toaster } from "sonner";

// Import the shared query client.
import { queryClient } from "@/lib/query-client";

// Import the visual theme provider.
import { ThemeProvider } from "@/providers/theme-provider";

// Export all global application providers.
export function AppProviders({ children }: PropsWithChildren) {
  // Compose all global providers in one place.
  return (
    <ThemeProvider
      defaultTheme="dark"
      storageKey="cloudops-ui-theme"
    >
      <QueryClientProvider client={queryClient}>
        {children}

        <Toaster
          closeButton
          position="top-right"
          richColors
        />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

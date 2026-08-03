// Import React utilities for context and state management.
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// Define the supported visual themes.
type Theme = "dark" | "light" | "system";

// Define the values exposed by the theme context.
interface ThemeContextValue {
  // Store the currently selected theme preference.
  theme: Theme;

  // Allow components to change the selected theme.
  setTheme: (theme: Theme) => void;
}

// Define the provider's configurable properties.
interface ThemeProviderProps extends PropsWithChildren {
  // Allow callers to choose the initial theme.
  defaultTheme?: Theme;

  // Define the local-storage key used to persist the preference.
  storageKey?: string;
}

// Create the theme context with no initial provider value.
const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

// Export the application theme provider.
export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "cloudops-ui-theme",
}: ThemeProviderProps) {
  // Read the stored preference or use the provided default.
  const [theme, setTheme] = useState<Theme>(() => {
    // Retrieve the previously selected theme.
    const storedTheme = window.localStorage.getItem(storageKey);

    // Return the stored value when it is valid.
    if (
      storedTheme === "dark" ||
      storedTheme === "light" ||
      storedTheme === "system"
    ) {
      return storedTheme;
    }

    // Fall back to the configured default.
    return defaultTheme;
  });

  // Apply the selected theme whenever it changes.
  useEffect(() => {
    // Access the document's root HTML element.
    const root = window.document.documentElement;

    // Remove any previously applied theme classes.
    root.classList.remove("light", "dark");

    // Resolve the operating-system preference.
    if (theme === "system") {
      // Ask the browser whether the operating system uses dark mode.
      const systemTheme = window.matchMedia(
        "(prefers-color-scheme: dark)",
      ).matches
        ? "dark"
        : "light";

      // Apply the resolved system theme.
      root.classList.add(systemTheme);

      // Persist the user's system-theme choice.
      window.localStorage.setItem(storageKey, theme);

      // Stop processing because the system value is now applied.
      return;
    }

    // Apply the explicitly selected theme.
    root.classList.add(theme);

    // Persist the user's explicit preference.
    window.localStorage.setItem(storageKey, theme);
  }, [storageKey, theme]);

  // Memoize the context value to avoid unnecessary child renders.
  const value = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme],
  );

  // Provide the theme state to the application.
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// Export a safe hook for consuming the theme context.
export function useTheme(): ThemeContextValue {
  // Read the nearest theme provider.
  const context = useContext(ThemeContext);

  // Fail clearly when the hook is used outside the provider.
  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider.",
    );
  }

  // Return the validated context.
  return context;
}
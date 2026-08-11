// Import navigation link.
import { Link } from "react-router-dom";

// Import reusable button.
import { Button } from "@/components/ui/button";

// Export the not-found page.
export function NotFoundPage() {
  // Render a friendly missing-route state.
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="max-w-lg text-center">
        <p className="text-sm font-medium text-primary">
          404
        </p>

        <h1 className="mt-2 text-3xl font-semibold">
          Page not found
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          The requested CloudOps Insight page does not exist.
        </p>

        <Button
          className="mt-6"
          render={<Link to="/" />}
        >
          Return to dashboard
        </Button>
      </div>
    </section>
  );
}
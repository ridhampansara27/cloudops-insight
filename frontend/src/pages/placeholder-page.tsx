// Define the properties accepted by the reusable placeholder page.
interface PlaceholderPageProps {
  // Display the page title.
  title: string;

  // Explain what will eventually be available.
  description: string;
}

// Export a reusable page for routes not yet implemented.
export function PlaceholderPage({
  title,
  description,
}: PlaceholderPageProps) {
  // Render a simple development placeholder.
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {title}
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      </div>

      <div className="flex min-h-80 items-center justify-center rounded-xl border border-dashed bg-card p-8 text-center">
        <div className="max-w-md">
          <p className="font-medium">
            This module will be implemented in a later step.
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            The route and dashboard navigation are already prepared.
          </p>
        </div>
      </div>
    </section>
  );
}
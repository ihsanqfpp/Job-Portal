import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms of Service — Hireway" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-4 text-muted-foreground">
        This page is a placeholder — replace it with your full terms before going live.
      </p>
    </div>
  ),
});

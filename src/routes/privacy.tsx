import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Hireway" }] }),
  component: () => (
    <div className="container mx-auto px-4 py-16 max-w-3xl prose dark:prose-invert">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-4 text-muted-foreground">
        We respect your privacy. This page is a placeholder — replace it with your full policy
        before going live.
      </p>
    </div>
  ),
});

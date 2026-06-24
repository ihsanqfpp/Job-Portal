import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this content. Please try again.",
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-destructive/20 bg-destructive/5 py-12 px-6 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-destructive" />
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}

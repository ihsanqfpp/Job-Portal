import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  icon,
  actionLabel,
  actionHref,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 px-6 text-center">
      <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {(action || (actionLabel && actionHref)) && (
        <div className="mt-5">
          {action ?? (
            <Button asChild>
              <Link to={actionHref!}>{actionLabel}</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

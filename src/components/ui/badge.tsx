import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
        outline: "text-foreground",
        /** ── Semantic status variants ── */
        success:
          "border-success/20 bg-success/12 text-success dark:border-success/30 dark:bg-success/15",
        warning:
          "border-warning/25 bg-warning/12 text-warning-foreground dark:border-warning/30 dark:bg-warning/15 dark:text-warning",
        info:
          "border-primary/20 bg-primary/10 text-primary dark:border-primary/30 dark:bg-primary/15",
        /** ── Job-type pill variants (rounded-full applied in component) ── */
        type:
          "border-secondary bg-secondary text-secondary-foreground rounded-full hover:bg-secondary/80",
        level:
          "border-accent/40 bg-accent text-accent-foreground rounded-full hover:bg-accent/80",
        remote:
          "border-success/20 bg-success/10 text-success rounded-full dark:border-success/30 dark:bg-success/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

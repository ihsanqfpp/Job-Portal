import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  children: React.ReactNode;
  sub?: string;
  /** Center layout (for testimonials, trust strips) vs left accent block */
  center?: boolean;
  /** Light variant for use on dark backgrounds */
  light?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  children,
  sub,
  center = false,
  light = false,
  className,
}: SectionHeadingProps) {
  if (center) {
    return (
      <div className={cn("mb-10 text-center", className)}>
        {eyebrow && (
          <p className={cn("mb-2 text-sm font-semibold uppercase tracking-widest", light ? "text-primary/80" : "text-primary")}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn("text-3xl font-extrabold md:text-4xl", light ? "text-white" : "text-foreground")}>
          {children}
        </h2>
        <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
        {sub && (
          <p className={cn("mx-auto mt-4 max-w-xl text-base", light ? "text-white/60" : "text-muted-foreground")}>
            {sub}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn("mb-10", className)}>
      <div className="je-heading-accent py-1">
        {eyebrow && (
          <p className={cn("mb-1 text-sm font-semibold uppercase tracking-widest", light ? "text-primary/80" : "text-primary")}>
            {eyebrow}
          </p>
        )}
        <h2 className={cn("text-3xl font-extrabold md:text-4xl", light ? "text-white" : "text-foreground")}>
          {children}
        </h2>
        {sub && (
          <p className={cn("mt-2 text-base", light ? "text-white/60" : "text-muted-foreground")}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

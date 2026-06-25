import { Link } from "@tanstack/react-router";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  className?: string;
}

export function PageHeader({ title, breadcrumbs = [], className }: PageHeaderProps) {
  const crumbs: BreadcrumbItem[] = [{ label: "Home", to: "/" }, ...breadcrumbs];

  return (
    <section
      className={cn("relative overflow-hidden py-16 md:py-20", className)}
      style={{ background: "linear-gradient(135deg, #0f1d22 0%, #2b3940 60%, #1a3040 100%)" }}
    >
      {/* Subtle diagonal stripe overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 12px)",
        }}
      />

      <div className="relative container mx-auto px-4 text-center">
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">{title}</h1>

        <nav
          aria-label="Breadcrumb"
          className="mt-4 flex items-center justify-center gap-1 text-sm text-white/60"
        >
          {crumbs.map((c, i) => (
            <span key={c.label} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-white/30" />}
              {c.to ? (
                <Link to={c.to} className="transition-colors hover:text-primary">
                  {i === 0 ? <Home className="inline h-3.5 w-3.5" /> : c.label}
                </Link>
              ) : (
                <span className="font-semibold text-primary">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      </div>
    </section>
  );
}

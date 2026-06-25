import { Link } from "@tanstack/react-router";
import {
  MapPin,
  Bookmark,
  BookmarkCheck,
  Clock,
  Briefcase,
  DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatSalary, timeAgo } from "@/lib/format";
import { matchTone } from "@/lib/match";
import { cn } from "@/lib/utils";

export type JobCardData = {
  id: string;
  title: string;
  description: string;
  location: string;
  type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  created_at: string;
  experience_level?: string | null;
  skills_required?: string[] | null;
  companies?: { name: string; logo_url: string | null } | null;
};

interface JobCardProps {
  job: JobCardData;
  matchScore?: number | null;
  isSaved?: boolean;
  onToggleSave?: (jobId: string) => void;
  compact?: boolean;
}

function typeLabel(type: string) {
  const map: Record<string, string> = {
    "full-time": "Full-time",
    "part-time": "Part-time",
    remote: "Remote",
    hybrid: "Hybrid",
    contract: "Contract",
    internship: "Internship",
  };
  return map[type] ?? type;
}

function MatchPill({ score }: { score: number }) {
  const tone = matchTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[2px] px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        tone === "good" && "bg-success/12 text-success",
        tone === "warn" &&
          "bg-warning/12 text-warning-foreground dark:text-warning",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {score}% match
    </span>
  );
}

export function JobCard({
  job,
  matchScore,
  isSaved = false,
  onToggleSave,
  compact = false,
}: JobCardProps) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const hasSalary = salary !== "Salary not disclosed";

  return (
    <div className="group relative">
      {/* Save button — sits outside the Link so clicks don't navigate */}
      {onToggleSave && (
        <button
          type="button"
          aria-label={isSaved ? `Unsave ${job.title}` : `Save ${job.title}`}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleSave(job.id);
          }}
          className={cn(
            "absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-[2px] border transition-all duration-300",
            isSaved
              ? "border-primary text-primary"
              : "border-border text-muted-foreground hover:border-primary hover:text-primary",
          )}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      )}

      <Link
        to="/jobs/$id"
        params={{ id: job.id }}
        className="block rounded-[2px] bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring je-card"
      >
        <div
          className={cn(
            "flex gap-4 p-5",
            compact ? "items-start" : "flex-col sm:flex-row sm:items-center",
          )}
        >
          {/* Company logo — square with border */}
          <div className="shrink-0">
            <div
              className={cn(
                "flex items-center justify-center rounded-[2px] border-2 border-border bg-background overflow-hidden",
                compact ? "h-14 w-14" : "h-20 w-20",
              )}
            >
              {job.companies?.logo_url ? (
                <img
                  src={job.companies.logo_url}
                  alt={job.companies.name ?? ""}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span
                  className={cn(
                    "font-extrabold text-primary",
                    compact ? "text-lg" : "text-2xl",
                  )}
                >
                  {(job.companies?.name?.[0] ?? "?").toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Title row */}
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3
                  className={cn(
                    "font-bold text-foreground transition-colors duration-300 group-hover:text-primary",
                    compact ? "text-sm" : "text-lg",
                  )}
                >
                  {job.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {job.companies?.name ?? "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {typeof matchScore === "number" && (
                  <MatchPill score={matchScore} />
                )}
                <span className="flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  {timeAgo(job.created_at)}
                </span>
              </div>
            </div>

            {/* Meta row — green inline icons per JobEntry style */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {job.location && (
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                {typeLabel(job.type)}
              </span>
              {hasSalary && (
                <span className="flex items-center gap-1.5 text-sm font-semibold tabular-nums text-foreground">
                  <DollarSign className="h-4 w-4 shrink-0 text-primary" />
                  {salary}
                </span>
              )}
              {job.experience_level && (
                <Badge
                  variant="outline"
                  className="rounded-[2px] border-primary/30 text-xs capitalize text-primary/80"
                >
                  {job.experience_level}
                </Badge>
              )}
            </div>
          </div>

          {/* Apply CTA — only when save handler present (real job pages) */}
          {!compact && onToggleSave && (
            <div className="shrink-0 self-end pr-10 sm:self-center sm:pr-0">
              <span className="inline-flex items-center rounded-[2px] bg-primary px-5 py-2 text-sm font-bold text-white transition-colors duration-300 group-hover:bg-primary/85">
                Apply Now
              </span>
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}

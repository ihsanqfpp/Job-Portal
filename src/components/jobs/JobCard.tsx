import { Link } from "@tanstack/react-router";
import { MapPin, Bookmark, BookmarkCheck, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CompanyAvatar } from "@/components/common/CompanyAvatar";
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
  /** Compact mode — used in dashboard sidebars */
  compact?: boolean;
}

/** Maps job type string → badge label. */
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

/** Match score pill with color coding. */
function MatchPill({ score }: { score: number }) {
  const tone = matchTone(score);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        tone === "good" &&
          "bg-success/12 text-success dark:bg-success/15",
        tone === "warn" &&
          "bg-warning/12 text-warning-foreground dark:bg-warning/15 dark:text-warning",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {score}% match
    </span>
  );
}

export function JobCard({ job, matchScore, isSaved = false, onToggleSave, compact = false }: JobCardProps) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);
  const hasSalary = salary !== "Salary not disclosed";
  const isRemote = job.type === "remote";

  return (
    <div className="group relative">
      {/* Bookmark button — floats top-right, only shown when handler provided */}
      {onToggleSave && (
        <button
          type="button"
          aria-label={isSaved ? `Unsave ${job.title}` : `Save ${job.title}`}
          onClick={(e) => {
            e.preventDefault();
            onToggleSave(job.id);
          }}
          className={cn(
            "absolute right-4 top-4 z-10 rounded-md p-1.5 transition-colors",
            "opacity-0 group-hover:opacity-100 focus:opacity-100",
            isSaved
              ? "text-primary"
              : "text-muted-foreground hover:text-primary",
          )}
        >
          {isSaved ? (
            <BookmarkCheck className="h-4 w-4 fill-primary" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
        </button>
      )}

      <Link to="/jobs/$id" params={{ id: job.id }} className="block outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <Card
          className={cn(
            "card-hover border border-border bg-card",
            "hover:border-primary/30",
            compact ? "p-4" : "p-5",
          )}
          style={{ boxShadow: "var(--shadow-card-val)" }}
        >
          <div className="flex items-start gap-4">
            {/* Company logo */}
            <CompanyAvatar
              name={job.companies?.name}
              logoUrl={job.companies?.logo_url}
              size={compact ? "sm" : "md"}
            />

            {/* Content */}
            <div className="min-w-0 flex-1">
              {/* Row 1: title + time */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={cn(
                      "font-semibold leading-snug group-hover:text-primary transition-colors",
                      compact ? "text-sm" : "text-base",
                    )}
                  >
                    {job.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-muted-foreground truncate">
                    {job.companies?.name ?? "—"}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2 pt-0.5">
                  {typeof matchScore === "number" && <MatchPill score={matchScore} />}
                  <span className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {timeAgo(job.created_at)}
                  </span>
                </div>
              </div>

              {/* Row 2: location + badges */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {job.location && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[140px]">{job.location}</span>
                  </span>
                )}
                <span className="text-muted-foreground/40 text-xs select-none">·</span>
                <Badge variant={isRemote ? "remote" : "type"} className="text-[11px] py-0 px-2 h-5">
                  {typeLabel(job.type)}
                </Badge>
                {job.experience_level && (
                  <Badge variant="level" className="text-[11px] py-0 px-2 h-5 capitalize">
                    {job.experience_level}
                  </Badge>
                )}
              </div>

              {/* Row 3: salary */}
              {!compact && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  {hasSalary ? (
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {salary}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Salary not disclosed</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Card>
      </Link>
    </div>
  );
}

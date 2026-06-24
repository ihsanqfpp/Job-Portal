import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface CompanyAvatarProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm:  { avatar: "h-9 w-9",  icon: "h-4 w-4", text: "text-xs" },
  md:  { avatar: "h-12 w-12", icon: "h-5 w-5", text: "text-sm" },
  lg:  { avatar: "h-16 w-16", icon: "h-7 w-7", text: "text-base" },
};

/**
 * Reusable company logo avatar.
 * Shows logo_url when available; falls back to two-letter initials or a
 * Building icon — always within a consistently-sized rounded-xl container.
 */
export function CompanyAvatar({ name, logoUrl, size = "md", className }: CompanyAvatarProps) {
  const s = sizeMap[size];
  const abbr = name ? initials(name) : null;

  return (
    <Avatar
      className={cn(
        s.avatar,
        "rounded-xl border border-border bg-card shrink-0",
        className,
      )}
    >
      <AvatarImage
        src={logoUrl ?? undefined}
        className="object-contain p-1.5"
        alt={name ? `${name} logo` : "Company logo"}
      />
      <AvatarFallback
        className={cn(
          "rounded-xl bg-muted text-muted-foreground font-semibold select-none",
          s.text,
        )}
      >
        {abbr && abbr !== "?" ? (
          abbr
        ) : (
          <Building2 className={s.icon} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}

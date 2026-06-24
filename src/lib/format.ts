export function formatSalary(min?: number | null, max?: number | null, currency = "USD") {
  if (!min && !max) return "Salary not disclosed";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  return fmt((min || max)!);
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(s: string, n = 200) {
  return s.length > n ? s.slice(0, n).trimEnd() + "…" : s;
}

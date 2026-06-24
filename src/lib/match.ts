export function computeMatch(
  jobSkills: string[] | null | undefined,
  resumeSkills: string[] | null | undefined,
): number | null {
  if (!jobSkills || jobSkills.length === 0) return null;
  if (!resumeSkills || resumeSkills.length === 0) return 0;
  const r = new Set(resumeSkills.map((s) => s.toLowerCase().trim()));
  let hits = 0;
  for (const s of jobSkills) if (r.has(s.toLowerCase().trim())) hits++;
  return Math.round((hits / jobSkills.length) * 100);
}

export function matchTone(pct: number): "good" | "warn" | "muted" {
  if (pct >= 80) return "good";
  if (pct >= 50) return "warn";
  return "muted";
}

/** Heuristic: fully remote only when explicitly remote (not hybrid). */
export function isRemote(location: string, workplaceType?: string | null): boolean {
  const hay = `${location ?? ""} ${workplaceType ?? ""}`.toLowerCase();
  if (!hay.trim()) return false;
  if (/\bhybrid\b/.test(hay)) return false;
  if (/\bfully\s*remote\b/.test(hay)) return true;
  if (/\bremote\s*only\b/.test(hay)) return true;
  if (/\bremote\b/.test(hay) && !/\bon[\s-]?site\b/.test(hay)) return true;
  return false;
}

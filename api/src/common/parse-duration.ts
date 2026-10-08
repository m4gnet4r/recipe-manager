/** Minimal "15m" / "7d" / "30s" / "2h" duration string -> milliseconds. */
export function parseDurationMs(input: string, fallbackMs: number): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim());
  if (!match) return fallbackMs;
  const value = Number(match[1]);
  const unit = match[2];
  const factor = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]!;
  return value * factor;
}

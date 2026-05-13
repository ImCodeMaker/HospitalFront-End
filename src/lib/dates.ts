/**
 * Safe date parsing: accepts ISO strings with/without Z, trims microseconds,
 * returns null on invalid input. Prevents JS "Invalid Date" rendering.
 */
export function parseDate(input: string | Date | null | undefined): Date | null {
  if (input == null) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;

  let s = String(input).trim();
  if (!s) return null;

  // Trim sub-millisecond fractional seconds (1234.567890 -> 1234.567)
  s = s.replace(/(\.\d{3})\d+/, "$1");

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(input: string | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(input);
  return d ? d.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" }) : fallback;
}

export function fmtDateTime(input: string | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(input);
  return d ? d.toLocaleString("es-DO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : fallback;
}

export function fmtTime(input: string | Date | null | undefined, fallback = "—"): string {
  const d = parseDate(input);
  return d ? d.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" }) : fallback;
}

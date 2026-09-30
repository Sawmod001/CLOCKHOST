/**
 * WAT (Africa/Lagos) date formatting — single source per AUDIT-UI-002 / E1.
 * Never use browser-local time. Always timeZone: "Africa/Lagos".
 */

export function formatWAT(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions = {}
): string {
  const d = date instanceof Date ? date : new Date(date);
  return new Intl.DateTimeFormat("en-NG", {
    timeZone: "Africa/Lagos",
    ...opts,
  }).format(d);
}

export function formatWATDate(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  return formatWAT(date, opts);
}

export function formatWATTime(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" }
): string {
  return formatWAT(date, opts);
}

export function formatWATDateTime(
  date: string | number | Date,
  opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }
): string {
  return formatWAT(date, opts);
}

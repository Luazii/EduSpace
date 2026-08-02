import { format, formatDistanceToNow, isPast } from "date-fns";

/** Format a timestamp (ms since epoch) to a human-readable date string */
export function formatDate(ts: number, fmt = "MMM d, yyyy"): string {
  return format(new Date(ts), fmt);
}

/** Format a timestamp to relative time (e.g. "3 days ago") */
export function fromNow(ts: number): string {
  return formatDistanceToNow(new Date(ts), { addSuffix: true });
}

/** Returns true if the timestamp is in the past */
export function isOverdue(ts: number): boolean {
  return isPast(new Date(ts));
}

/** Format a mark as a percentage string */
export function pct(mark: number, maxMark: number): string {
  if (!maxMark) return "N/A";
  return `${Math.round((mark / maxMark) * 100)}%`;
}

/** Concatenate class names (simple utility for conditional classes) */
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Truncate a string to a max length with an ellipsis */
export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return `${str.slice(0, len)}…`;
}

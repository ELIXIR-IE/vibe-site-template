// Date helpers shared by the Astro pages and the build scripts.
//
// Dates in the data files are plain calendar dates ("2027-04-20") or full
// timestamps with an offset ("2027-04-13T17:00:00+01:00"). Calendar dates are
// formatted from their digits, so the output never shifts with the time zone
// of the machine that builds the site.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** @param {string} value */
export function parseDay(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  if (!m) throw new Error(`Not a date: "${value}" (use YYYY-MM-DD)`);
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const weekday = new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
  return { y, m: mo, d, weekday };
}

/**
 * "20 April 2027", or "Tuesday 20 April 2027" with weekday.
 * @param {string} value
 * @param {{ weekday?: boolean, year?: boolean, short?: boolean }} [opts]
 */
export function formatDate(value, opts = {}) {
  const { y, m, d, weekday } = parseDay(value);
  const month = opts.short ? MONTHS[m - 1].slice(0, 3) : MONTHS[m - 1];
  const parts = [];
  if (opts.weekday) parts.push(opts.short ? WEEKDAYS[weekday].slice(0, 3) : WEEKDAYS[weekday]);
  parts.push(String(d), month);
  if (opts.year !== false) parts.push(String(y));
  return parts.join(" ");
}

/** "20–22 April 2027", "30 April – 2 May 2027", or across years in full. */
export function formatRange(start, end) {
  const a = parseDay(start);
  const b = parseDay(end);
  if (a.y === b.y && a.m === b.m && a.d === b.d) return formatDate(start);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${a.y}`;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Day number and short month, for date badges. */
export function dayBadge(value) {
  const { d, m } = parseDay(value);
  return { day: String(d).padStart(2, "0"), month: MONTHS[m - 1].slice(0, 3) };
}

/**
 * Turn a data-file date into an exact instant string with offset.
 * A plain date means the start of that day, or the end of it when endOfDay is set.
 * @param {string} value
 * @param {string} offset e.g. "+01:00"
 * @param {boolean} [endOfDay]
 */
export function toInstant(value, offset, endOfDay = false) {
  const s = String(value);
  if (s.includes("T")) return s;
  return `${s.slice(0, 10)}T${endOfDay ? "23:59:59" : "00:00:00"}${offset}`;
}

/** Combine a calendar date and "HH:MM" into an instant string with offset. */
export function atTime(date, time, offset) {
  return `${String(date).slice(0, 10)}T${time}:00${offset}`;
}

/**
 * Where "now" falls relative to a window: "before", "during" or "after".
 * @param {string | undefined} from instant string
 * @param {string | undefined} until instant string
 */
export function windowState(from, until, now = new Date()) {
  const t = now.getTime();
  if (from && t < Date.parse(from)) return "before";
  if (until && t > Date.parse(until)) return "after";
  return "during";
}

/**
 * Dates for display, or "Dates TBC" when they are not set yet.
 * @param {string | null | undefined} start
 * @param {string | null | undefined} [end]
 */
export function formatWhen(start, end) {
  if (!start) return "Dates TBC";
  return end ? formatRange(start, end) : formatDate(start);
}

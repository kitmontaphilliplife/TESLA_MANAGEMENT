const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthCell {
  year: number;
  month: number; // 1-12
  label: string;
}

function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

// Every calendar month from `fromIso` through `toIso`, inclusive — may cross a year boundary
// (e.g. Jun 2026 – May 2027), unlike a fixed Jan–Dec grid for a single year.
export function monthsBetweenInclusive(fromIso: string, toIso: string): MonthCell[] {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  const start = monthIndex(fy, fm);
  const end = monthIndex(ty, tm);
  const cells: MonthCell[] = [];
  for (let i = start; i <= end; i++) {
    const y = Math.floor(i / 12);
    const m = (i % 12) + 1;
    cells.push({ year: y, month: m, label: MONTH_ABBR[m - 1] });
  }
  return cells;
}

// How many distinct calendar months `fromIso`–`toIso` spans, inclusive.
export function monthCountInclusive(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  return monthIndex(ty, tm) - monthIndex(fy, fm) + 1;
}

// `iso` shifted by whole calendar months, day-of-month clamped to the destination month's length.
export function addMonthsClampToDay(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const total = monthIndex(y, m) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const lastDay = new Date(ny, nm, 0).getDate();
  const nd = Math.min(d, lastDay);
  return `${ny}-${String(nm).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
}

// A date's fractional position along the `months` axis (0 = start of the first month, N = end of
// the last), clamped to the range's edges for dates that fall outside it entirely.
export function monthOffset(dateStr: string, months: MonthCell[]): number {
  const d = new Date(dateStr);
  const di = monthIndex(d.getFullYear(), d.getMonth() + 1);
  const baseIdx = monthIndex(months[0].year, months[0].month);
  const clampedIdx = Math.max(baseIdx, Math.min(baseIdx + months.length - 1, di));
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const dayFrac = di === clampedIdx ? (d.getDate() - 1) / daysInMonth : di < baseIdx ? 0 : 1;
  return clampedIdx - baseIdx + dayFrac;
}

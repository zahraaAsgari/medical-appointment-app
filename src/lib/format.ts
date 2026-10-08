import * as jalaali from "jalaali-js";

/* ------------------------------ Persian digits ------------------------------ */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function fa(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function toLatinDigits(input: string): string {
  const map: Record<string, string> = {};
  FA_DIGITS.forEach((d, i) => (map[d] = String(i)));
  const ext = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  const arabic = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  ext.forEach((d, i) => (map[d] = String(i)));
  arabic.forEach((d, i) => (map[d] = String(i)));
  return input.replace(/[۰-۹٠-٩]/g, (ch) => map[ch] ?? ch);
}

/* --------------------------------- Time ------------------------------------ */

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function toHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function faTime(t: string): string {
  return fa(t);
}

/** e.g. 90 -> "۱ ساعت و ۳۰ دقیقه" */
export function faDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${fa(h)} ساعت و ${fa(m)} دقیقه`;
  if (h) return `${fa(h)} ساعت`;
  return `${fa(m)} دقیقه`;
}

/* ------------------------------ ISO date utils ----------------------------- */

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDaysISO(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

export function isValidISODate(v: unknown): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(fromISO(v).getTime());
}

export function isValidTime(v: unknown): v is string {
  return typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** Persian week index: 0 = Saturday ... 6 = Friday */
export function dayIndexOf(iso: string): number {
  return (fromISO(iso).getDay() + 1) % 7;
}

/* ------------------------------ Jalali helpers ----------------------------- */

export const WEEKDAYS_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
export const WEEKDAYS_FA_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"];
export const MONTHS_FA = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
];

export function jOf(iso: string): { jy: number; jm: number; jd: number } {
  const [y, m, d] = iso.split("-").map(Number);
  return jalaali.toJalaali(y, m, d);
}

export function isoOfJalali(jy: number, jm: number, jd: number): string {
  const g = jalaali.toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
}

export function jalaaliMonthLength(jy: number, jm: number): number {
  return jalaali.jalaaliMonthLength(jy, jm);
}

export function monthTitle(jy: number, jm: number): string {
  return `${MONTHS_FA[jm - 1]} ${fa(jy)}`;
}

export function formatDate(iso: string): string {
  const { jy, jm, jd } = jOf(iso);
  return `${fa(jy)}/${fa(String(jm).padStart(2, "0"))}/${fa(String(jd).padStart(2, "0"))}`;
}

export function formatDateLong(iso: string): string {
  const { jy, jm, jd } = jOf(iso);
  return `${WEEKDAYS_FA[dayIndexOf(iso)]} ${fa(jd)} ${MONTHS_FA[jm - 1]} ${fa(jy)}`;
}

export function relativeDayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "امروز";
  if (iso === addDaysISO(today, 1)) return "فردا";
  if (iso === addDaysISO(today, -1)) return "دیروز";
  return formatDateLong(iso);
}

export interface MonthCell {
  iso: string;
  jd: number;
  inMonth: boolean;
}

/** 42 cells (6 weeks x 7) starting on Saturday for the given Jalali month */
export function buildMonthGrid(jy: number, jm: number): MonthCell[] {
  const first = isoOfJalali(jy, jm, 1);
  const offset = dayIndexOf(first);
  const start = addDaysISO(first, -offset);
  const len = jalaaliMonthLength(jy, jm);
  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const iso = addDaysISO(start, i);
    const j = jOf(iso);
    cells.push({ iso, jd: j.jd, inMonth: j.jd >= 1 && j.jd <= len && j.jm === jm && j.jy === jy });
  }
  return cells;
}

/* ------------------------------ Domain labels ------------------------------ */

/** MVP statuses only: scheduled / completed / cancelled. */
export const STATUS_LABEL: Record<string, string> = {
  scheduled: "رزرو شده",
  completed: "انجام شده",
  cancelled: "لغو شده",
};

/**
 * Read-only labels for legacy rows stored before the MVP status cleanup.
 * Historical data renders sensibly without re-enabling these statuses.
 */
const LEGACY_STATUS_LABEL: Record<string, string> = {
  confirmed: "تأیید شده",
  no_show: "عدم حضور",
};

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? LEGACY_STATUS_LABEL[status] ?? status;
}

export const REASON_LABEL: Record<string, string> = {
  surgery: "عمل جراحی",
  emergency: "اورژانس",
  conference: "کنگره / همایش",
  leave: "مرخصی",
  vacation: "سفر",
  other: "سایر",
};



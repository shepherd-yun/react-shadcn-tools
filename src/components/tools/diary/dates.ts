import { Lunar, LunarMonth, Solar } from "lunar-typescript";

/** 日记日期一律是本地日历上的 YYYY-MM-DD */

const pad = (n: number) => String(n).padStart(2, "0");
const WEEK = ["日", "一", "二", "三", "四", "五", "六"];
const NUM = ["零", "一", "两", "三", "四", "五", "六", "七", "八", "九", "十"];

export function ymd(y: number, m: number, d: number) {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function todayStr() {
  const t = new Date();
  return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

export function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d };
}

export function isValidDate(date: string | null): date is string {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const { y, m, d } = parts(date);
  const t = new Date(y, m - 1, d);
  return t.getFullYear() === y && t.getMonth() === m - 1 && t.getDate() === d && y >= 1901 && y <= 2099;
}

export function addDays(date: string, n: number) {
  const { y, m, d } = parts(date);
  const t = new Date(y, m - 1, d + n);
  return ymd(t.getFullYear(), t.getMonth() + 1, t.getDate());
}

export function weekday(date: string) {
  const { y, m, d } = parts(date);
  return "星期" + WEEK[new Date(y, m - 1, d).getDay()];
}

export function solarText(date: string) {
  const { m, d } = parts(date);
  return `${m}月${d}日`;
}

export function lunarOf(date: string) {
  const { y, m, d } = parts(date);
  return Solar.fromYmd(y, m, d).getLunar();
}

/** 十月初六、闰六月初六 */
export function lunarText(date: string) {
  const l = lunarOf(date);
  return `${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

/** 丙午年 十月初六 */
export function lunarFull(date: string) {
  const l = lunarOf(date);
  return `${l.getYearInGanZhi()}年 ${l.getMonthInChinese()}月${l.getDayInChinese()}`;
}

export function yearsAgo(n: number) {
  return n <= 10 ? `${NUM[n]}年前` : `${n} 年前`;
}

export function timeText(iso: string) {
  const t = new Date(iso);
  const hm = `${pad(t.getHours())}:${pad(t.getMinutes())}`;
  const same = ymd(t.getFullYear(), t.getMonth() + 1, t.getDate()) === todayStr();
  return same ? hm : `${t.getMonth() + 1}月${t.getDate()}日 ${hm}`;
}

export type Mode = "solar" | "lunar";

export interface PastDay {
  /** 往年对应的阳历日期 */
  date: string;
  /** 距今几年（阳历按年份差，农历按农历年差） */
  ago: number;
  /** 那年没有这一天，换成了相近的一天 */
  note: string | null;
}

const MAX_YEARS = 30;

function isLeapYear(y: number) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** 往年的同月同日，从去年往前到 firstYear。2 月 29 日在非闰年取 28 日 */
export function solarPastDays(date: string, firstYear: number): PastDay[] {
  const { y, m, d } = parts(date);
  const out: PastDay[] = [];
  for (let year = y - 1; year >= Math.max(firstYear, y - MAX_YEARS); year--) {
    if (m === 2 && d === 29 && !isLeapYear(year)) {
      out.push({ date: ymd(year, 2, 28), ago: y - year, note: "那年没有 2月29日" });
    } else {
      out.push({ date: ymd(year, m, d), ago: y - year, note: null });
    }
  }
  return out;
}

/**
 * 往年的同一农历月日。闰月按同号的普通月找；那年这个月没有三十就取廿九。
 * firstDate 是最早一篇日记的日期，往前找到它所在的农历年为止
 */
export function lunarPastDays(date: string, firstDate: string): PastDay[] {
  const l = lunarOf(date);
  const month = Math.abs(l.getMonth());
  const day = l.getDay();
  const firstLunarYear = lunarOf(firstDate).getYear();
  const out: PastDay[] = [];
  for (let year = l.getYear() - 1; year >= Math.max(firstLunarYear, l.getYear() - MAX_YEARS); year--) {
    const lm = LunarMonth.fromYm(year, month);
    if (!lm) continue;
    const dd = Math.min(day, lm.getDayCount());
    const s = Lunar.fromYmd(year, month, dd).getSolar();
    let note: string | null = null;
    if (dd < day) note = `那年${monthName(month)}月没有三十`;
    else if (l.getMonth() < 0) note = `那年按${monthName(month)}月算`;
    out.push({ date: ymd(s.getYear(), s.getMonth(), s.getDay()), ago: l.getYear() - year, note });
  }
  return out;
}

function monthName(month: number) {
  return Lunar.fromYmd(2000, month, 1).getMonthInChinese();
}

export interface DayCell {
  date: string;
  day: number;
  /** 农历日；初一显示月名；节气、节日显示名称 */
  label: string;
  special: boolean;
}

/** 阳历节日只显示国内常用的，万圣节、感恩节之类不占格子 */
const SOLAR_FESTIVALS = new Set(["元旦节", "元旦", "妇女节", "劳动节", "青年节", "儿童节", "建党节", "建军节", "教师节", "国庆节"]);

/** 日历格子用：节气 > 农历节日 > 主要阳历节日 > 初一月名 > 农历日 */
export function dayCell(date: string): DayCell {
  const { y, m, d } = parts(date);
  const solar = Solar.fromYmd(y, m, d);
  const l = solar.getLunar();
  const name = l.getJieQi() || l.getFestivals()[0] || solar.getFestivals().find((f) => SOLAR_FESTIVALS.has(f));
  if (name) return { date, day: d, label: name, special: true };
  if (l.getDay() === 1) return { date, day: d, label: `${l.getMonthInChinese()}月`, special: true };
  return { date, day: d, label: l.getDayInChinese(), special: false };
}

export function monthStr(date: string) {
  return date.slice(0, 7);
}

export function isValidMonth(month: string | null): month is string {
  return !!month && /^\d{4}-\d{2}$/.test(month) && isValidDate(`${month}-01`);
}

export function daysInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function addMonths(month: string, n: number) {
  const [y, m] = month.split("-").map(Number);
  const t = new Date(y, m - 1 + n, 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
}

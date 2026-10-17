import { useMemo } from "react";
import { Solar } from "lunar-typescript";
import type { DayInfo, HolidaySchedule } from "./types";
import { INTERNATIONAL_DAYS } from "./constants";

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m + 1)}-${pad2(d)}`;
}

function buildDayInfo(
  y: number,
  m: number, // 0-indexed
  d: number,
  isCurrentMonth: boolean,
  todayStr: string,
  schedule: HolidaySchedule,
  showWorldDays: boolean,
): DayInfo {
  const date = new Date(y, m, d);
  const wd = date.getDay();
  const isWeekend = wd === 0 || wd === 6;
  const isToday = dateKey(y, m, d) === todayStr;

  const solar = Solar.fromYmd(y, m + 1, d);
  const lunar = solar.getLunar();

  // Lunar text
  const lunarDayNum = lunar.getDay();
  const lunarDayStr = lunar.getDayInChinese();
  const lunarMonthStr = lunar.getMonthInChinese() + "月";
  const lunarDisplay = lunarDayNum === 1 ? lunarMonthStr : lunarDayStr;

  // Solar term
  const jieQi = lunar.getJieQi();
  const solarTerm = jieQi || null;

  // Festivals
  const festivals: string[] = [];

  // Lunar festivals
  for (const f of lunar.getFestivals()) festivals.push(f);

  // Solar festivals
  for (const f of solar.getFestivals()) festivals.push(f);

  // World days / international days (only when enabled)
  if (showWorldDays) {
    for (const f of lunar.getOtherFestivals()) festivals.push(f);
    for (const f of solar.getOtherFestivals()) festivals.push(f);

    const intlKey = `${m + 1}-${d}`;
    const intlDay = INTERNATIONAL_DAYS[intlKey];
    if (intlDay && !festivals.includes(intlDay)) festivals.push(intlDay);

    // Mother's day (2nd Sunday of May), Father's day (3rd Sunday of June)
    if (m === 4 && wd === 0) {
      const weekOfMonth = Math.ceil(d / 7);
      if (weekOfMonth === 2 && !festivals.includes("母亲节")) festivals.push("母亲节");
    }
    if (m === 5 && wd === 0) {
      const weekOfMonth = Math.ceil(d / 7);
      if (weekOfMonth === 3 && !festivals.includes("父亲节")) festivals.push("父亲节");
    }
  }

  // Display text priority: solar term > festival > lunar
  let displayText = lunarDisplay;
  let displayType: DayInfo["displayType"] = "lunar";

  if (solarTerm) {
    displayText = solarTerm;
    displayType = "solarTerm";
  }

  if (festivals.length > 0) {
    displayText = festivals[0];
    displayType = festivals[0].includes("节") || festivals[0].includes("年") || festivals[0].includes("元宵") || festivals[0].includes("除夕") || festivals[0].includes("中秋") || festivals[0].includes("七夕") || festivals[0].includes("端午") || festivals[0].includes("重阳") || festivals[0].includes("腊八")
      ? "holiday"
      : "festival";
  }

  // Schedule type
  const dk = dateKey(y, m, d);
  const override = schedule[dk] ?? null;
  let scheduleType: DayInfo["scheduleType"];
  if (override === "xiu") scheduleType = "xiu";
  else if (override === "ban") scheduleType = "ban";
  else if (isWeekend) scheduleType = "weekend";
  else scheduleType = "workday";

  // GanZhi and detail
  const ganZhiYear = lunar.getYearInGanZhi();
  const ganZhiMonth = lunar.getMonthInGanZhi();
  const ganZhiDay = lunar.getDayInGanZhi();
  const animal = lunar.getYearShengXiao();
  const xingZuo = solar.getXingZuo();

  return {
    date,
    day: d,
    month: m,
    year: y,
    isCurrentMonth,
    isToday,
    isWeekend,
    weekday: wd,
    lunarDay: lunarDisplay,
    lunarMonth: lunarMonthStr,
    displayText,
    displayType,
    scheduleType,
    solarTerm,
    festivals,
    ganZhiYear,
    ganZhiMonth,
    ganZhiDay,
    animal,
    xingZuo,
  };
}

export function useCalendarData(
  year: number,
  month: number, // 0-indexed
  schedule: HolidaySchedule,
  showWorldDays: boolean,
): DayInfo[] {
  return useMemo(() => {
    const today = new Date();
    const todayStr = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

    const firstDay = new Date(year, month, 1);
    let startWeekday = firstDay.getDay() - 1; // Monday=0
    if (startWeekday < 0) startWeekday = 6;

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: DayInfo[] = [];

    // Previous month fill
    for (let i = startWeekday - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push(buildDayInfo(y, m, d, false, todayStr, schedule, showWorldDays));
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(buildDayInfo(year, month, d, true, todayStr, schedule, showWorldDays));
    }

    // Next month fill
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push(buildDayInfo(y, m, d, false, todayStr, schedule, showWorldDays));
    }

    return days;
  }, [year, month, schedule, showWorldDays]);
}

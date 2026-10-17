export interface DayInfo {
  date: Date;
  day: number;
  month: number; // 0-indexed
  year: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  weekday: number; // 0=Sun, 6=Sat
  // Lunar
  lunarDay: string;
  lunarMonth: string;
  // Display text (priority: holiday > solar term > festival > lunar)
  displayText: string;
  displayType: "holiday" | "solarTerm" | "festival" | "lunar";
  // Schedule
  scheduleType: "xiu" | "ban" | "weekend" | "workday";
  // Detail
  solarTerm: string | null;
  festivals: string[];
  ganZhiYear: string;
  ganZhiMonth: string;
  ganZhiDay: string;
  animal: string;
  xingZuo: string;
}

export interface HolidaySchedule {
  [dateKey: string]: "xiu" | "ban"; // "YYYY-MM-DD" → 休 or 班
}

import { useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Solar } from "lunar-typescript";
import { ToolPage } from "../../ToolPage";
import { WEEKDAYS, YEAR_MIN, YEAR_MAX, HOLIDAY_SCHEDULE } from "./constants";
import { useCalendarData } from "./useCalendarData";
import type { DayInfo } from "./types";

const WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"];

// Schedule badge
function ScheduleBadge({ type }: { type: DayInfo["scheduleType"] }) {
  if (type === "workday") return null;
  const config = {
    xiu: { text: "休", cls: "bg-green-500 text-white" },
    ban: { text: "班", cls: "bg-orange-500 text-white" },
    weekend: { text: "末", cls: "bg-rose-400 text-white" },
  };
  const c = config[type];
  return (
    <span className={`absolute top-0.5 right-0.5 text-[8px] sm:text-[9px] leading-none px-[3px] py-[1.5px] rounded-sm font-medium ${c.cls}`}>
      {c.text}
    </span>
  );
}

export default function CalendarTool() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<DayInfo | null>(null);

  const [showWorldDays, setShowWorldDays] = useState(false);
  const days = useCalendarData(year, month, HOLIDAY_SCHEDULE, showWorldDays);

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelectedDay(null);
  };

  const selectedLunar = selectedDay
    ? Solar.fromYmd(selectedDay.year, selectedDay.month + 1, selectedDay.day).getLunar()
    : Solar.fromYmd(year, month + 1, 1).getLunar();

  return (
    <ToolPage title="日历" description="公历农历对照，节气节日，休班调休" icon={<Calendar className="w-5 h-5" />}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <button onClick={() => setYear((y) => Math.max(y - 1, YEAR_MIN))} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-border bg-background text-[14px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <button onClick={() => setYear((y) => Math.min(y + 1, YEAR_MAX))} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-8 px-2 rounded-lg border border-border bg-background text-[14px] cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i + 1}月</option>
            ))}
          </select>
          <button onClick={nextMonth} className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={goToday}
          className="h-8 px-3 rounded-lg text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer transition-colors border border-border"
        >
          回到今天
        </button>

        <button
          onClick={() => setShowWorldDays((v) => !v)}
          className={`h-8 px-3 rounded-lg text-[13px] cursor-pointer transition-colors border border-border ${showWorldDays ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
        >
          世界日
        </button>

        <div className="text-[13px] text-muted-foreground ml-auto hidden sm:block">
          {selectedLunar.getYearInGanZhi()}年（{selectedLunar.getYearShengXiao()}年）
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Calendar Grid */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="grid grid-cols-7 bg-muted/40">
              {WEEKDAYS.map((w, i) => (
                <div key={w} className={`py-2 text-center text-[12px] font-medium ${i >= 5 ? "text-rose-400" : "text-muted-foreground"}`}>
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((day, idx) => {
                const isSelected = selectedDay && selectedDay.year === day.year && selectedDay.month === day.month && selectedDay.day === day.day;
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDay(day)}
                    className={`relative flex flex-col items-center py-1.5 sm:py-2.5 cursor-pointer transition-all duration-150 border-t border-border/50
                      ${!day.isCurrentMonth ? "opacity-25" : ""}
                      ${day.isToday && !isSelected ? "bg-primary/[0.06]" : "hover:bg-muted/50"}
                      ${isSelected ? "!bg-primary/10 ring-1 ring-inset ring-primary/30" : ""}
                    `}
                  >
                    <ScheduleBadge type={day.scheduleType} />
                    <span className={`text-[13px] sm:text-[15px] tabular-nums leading-none
                      ${day.isToday ? "w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center" : ""}
                      ${day.isWeekend && !day.isToday ? "text-rose-400" : ""}
                    `}>
                      {day.day}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 leading-none truncate max-w-full px-0.5
                      ${day.displayType === "holiday" ? "text-rose-500 font-medium" : ""}
                      ${day.displayType === "solarTerm" ? "text-emerald-600 font-medium" : ""}
                      ${day.displayType === "festival" ? "text-sky-500" : ""}
                      ${day.displayType === "lunar" ? "text-muted-foreground/70" : ""}
                    `}>
                      {day.displayText}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Date detail panel */}
        {selectedDay && selectedDay.isCurrentMonth && (
          <div className="lg:w-[280px] shrink-0">
            <DateDetail day={selectedDay} />
          </div>
        )}
      </div>
    </ToolPage>
  );
}

function DateDetail({ day }: { day: DayInfo }) {
  const solar = Solar.fromYmd(day.year, day.month + 1, day.day);
  const lunar = solar.getLunar();

  const items: { label: string; value: string; color?: string }[] = [
    {
      label: "公历",
      value: `${day.year}年${day.month + 1}月${day.day}日 星期${WEEKDAY_NAMES[day.weekday]}`,
    },
    {
      label: "农历",
      value: `${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    },
    {
      label: "干支",
      value: `${day.ganZhiYear}年 ${day.ganZhiMonth}月 ${day.ganZhiDay}日`,
    },
    { label: "生肖", value: day.animal },
    { label: "星座", value: day.xingZuo + "座" },
  ];

  if (day.solarTerm) {
    items.push({ label: "节气", value: day.solarTerm, color: "text-emerald-600" });
  }

  if (day.festivals.length > 0) {
    items.push({ label: "节日", value: day.festivals.join("、"), color: "text-rose-500" });
  }

  const scheduleLabels = { xiu: "休息日", ban: "补班日", weekend: "周末", workday: "工作日" };
  items.push({ label: "状态", value: scheduleLabels[day.scheduleType] });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="bg-primary/[0.06] px-4 py-4 text-center border-b border-border">
        <div className="text-[36px] font-bold tabular-nums leading-none">{day.day}</div>
        <div className="text-[13px] text-muted-foreground mt-1.5">
          {day.year}年{day.month + 1}月 · 星期{WEEKDAY_NAMES[day.weekday]}
        </div>
        <div className="text-[13px] mt-1">
          {lunar.getMonthInChinese()}月{lunar.getDayInChinese()}
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-2 px-4 py-2 text-[13px]">
            <span className="text-muted-foreground shrink-0 w-10">{item.label}</span>
            <span className={item.color ?? ""}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { DiaryShell, RoundButton } from "./DiaryShell";
import { getSummaries, type DiarySummary } from "./api";
import {
  addMonths,
  dayCell,
  daysInMonth,
  isValidMonth,
  lunarOf,
  lunarText,
  monthStr,
  solarText,
  todayStr,
  weekday,
  ymd,
} from "./dates";
import { useOnThisDay } from "./useOnThisDay";

const WEEK_HEAD = ["日", "一", "二", "三", "四", "五", "六"];

export default function DiaryCalendar() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const today = todayStr();
  const raw = params.get("month");
  const month = isValidMonth(raw) ? raw : monthStr(today);
  const [y, m] = month.split("-").map(Number);
  const count = daysInMonth(month);
  const first = `${month}-01`;
  const last = `${month}-${String(count).padStart(2, "0")}`;

  // 选中的日子跟着月份走：换月后默认选今天（本月）或 1 号
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked && monthStr(picked) === month ? picked : monthStr(today) === month ? today : first;
  const setSelected = setPicked;

  // 结果带上是哪个月的；和当前月份对不上就是还在加载
  const [loaded, setLoaded] = useState<{ month: string; map: Map<string, DiarySummary> } | null>(null);
  const summaries = loaded?.month === month ? loaded.map : null;
  useEffect(() => {
    let cancelled = false;
    getSummaries(first, last)
      .then((list) => !cancelled && setLoaded({ month, map: new Map(list.map((s) => [s.date, s])) }))
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "加载日历失败");
        setLoaded({ month, map: new Map() });
      });
    return () => {
      cancelled = true;
    };
  }, [month, first, last]);

  const cells = Array.from({ length: count }, (_, i) => dayCell(ymd(y, m, i + 1)));
  const offset = new Date(y, m - 1, 1).getDay();
  const go = (n: number) => navigate(`/diary/calendar?month=${addMonths(month, n)}`, { replace: true });

  return (
    <DiaryShell>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h1 className="diary-serif m-0 text-[30px] leading-[1.2] font-bold">
            {y}年{m}月
          </h1>
          <div className="flex gap-2">
            <RoundButton label="上个月" onClick={() => go(-1)}>
              <ChevronLeft className="size-5" />
            </RoundButton>
            <RoundButton label="下个月" onClick={() => go(1)}>
              <ChevronRight className="size-5" />
            </RoundButton>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--d-muted)]">
          <span>{lunarRange(first, last)}</span>
          <span aria-hidden="true">·</span>
          <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--d-red)]" />
          <span>{summaries ? `本月已写 ${summaries.size} 天` : "加载中…"}</span>
          {monthStr(today) !== month && (
            <Link to="/diary/calendar" replace className="ml-auto font-medium text-[var(--d-red)]">
              回到本月
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-7 border-b-2 border-[var(--d-ink)] pb-2">
          {WEEK_HEAD.map((w) => (
            <div key={w} className="text-center text-[12px] text-[var(--d-muted)]">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-0.5">
          {Array.from({ length: offset }, (_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {cells.map((c) => {
            const isToday = c.date === today;
            const isSelected = c.date === selected;
            const has = summaries?.has(c.date) ?? false;
            return (
              <div key={c.date} className="flex justify-center">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${solarText(c.date)}，农历${lunarText(c.date)}${has ? "，已写日记" : ""}`}
                  onClick={() => setSelected(c.date)}
                  onDoubleClick={() => navigate(c.date === today ? "/diary" : `/diary?date=${c.date}`)}
                  className={`flex h-[58px] w-full max-w-[46px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-sm md:h-[72px] md:max-w-[72px] ${
                    isToday
                      ? "bg-[var(--d-red)] text-white"
                      : isSelected
                        ? "outline-[1.5px] outline-[var(--d-ink)] -outline-offset-[1.5px]"
                        : "hover:bg-[var(--d-line-soft)]"
                  } ${isToday && isSelected ? "ring-2 ring-[var(--d-ink)] ring-offset-1 ring-offset-[var(--d-bg)]" : ""}`}
                >
                  <span className={`diary-serif text-[17px] leading-[1.1] ${isToday ? "font-bold" : "font-medium"}`}>
                    {c.day}
                  </span>
                  <span
                    className={`max-w-full truncate px-0.5 text-[11px] leading-[1.2] ${
                      isToday ? "" : c.special ? "font-bold text-[var(--d-red)]" : "text-[var(--d-muted)]"
                    }`}
                  >
                    {c.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className={`size-[5px] rounded-full ${has ? (isToday ? "bg-white" : "bg-[var(--d-red)]") : ""}`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <SelectedDay date={selected} summary={summaries?.get(selected) ?? null} loading={!summaries} />
    </DiaryShell>
  );
}

function SelectedDay({ date, summary, loading }: { date: string; summary: DiarySummary | null; loading: boolean }) {
  const today = todayStr();
  const { loading: pastLoading, solar, lunar } = useOnThisDay(date);
  const solarCount = solar.filter((r) => r.entry).length;
  const lunarCount = lunar.filter((r) => r.entry).length;
  const base = `/diary/on-this-day?date=${date}`;

  return (
    <section className="flex flex-col gap-2.5 rounded border border-[var(--d-line)] bg-[var(--d-card)] p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-[15px] font-bold">
          {solarText(date)} {weekday(date)}
        </div>
        <div className="text-[12px] text-[var(--d-muted)]">
          农历{lunarText(date)}
          {date === today ? " · 今天" : ""}
        </div>
      </div>
      <p className="m-0 line-clamp-2 min-h-[3.4em] text-[14px] leading-[1.7] whitespace-pre-wrap">
        {loading ? (
          <span className="text-[var(--d-muted)]">加载中…</span>
        ) : summary ? (
          summary.excerpt || <span className="text-[var(--d-muted)]">（只有 {summary.photoCount} 张照片）</span>
        ) : (
          <span className="text-[var(--d-muted)]">这一天没有写日记</span>
        )}
      </p>
      <Link
        to={date === today ? "/diary" : `/diary?date=${date}`}
        className="flex min-h-11 items-center justify-center rounded-sm bg-[var(--d-red)] text-[14px] font-medium text-white"
      >
        {summary ? "打开日记" : "写这一天"}
      </Link>
      <div className="flex gap-2">
        <Link
          to={`${base}&mode=solar`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-sm border border-[var(--d-ink)] text-[13px] font-medium"
        >
          往年 {solarText(date)} · {pastLoading ? "…" : solarCount}
        </Link>
        <Link
          to={`${base}&mode=lunar`}
          className="flex min-h-11 flex-1 items-center justify-center rounded-sm border border-[var(--d-ink)] text-[13px] font-medium"
        >
          往年{lunarText(date)} · {pastLoading ? "…" : lunarCount}
        </Link>
      </div>
    </section>
  );
}

/** 丙午年 九月 – 十月；跨农历年时两头都写年 */
function lunarRange(first: string, last: string) {
  const a = lunarOf(first);
  const b = lunarOf(last);
  const am = `${a.getMonthInChinese()}月`;
  const bm = `${b.getMonthInChinese()}月`;
  if (a.getYear() !== b.getYear()) return `${a.getYearInGanZhi()}年${am} – ${b.getYearInGanZhi()}年${bm}`;
  return am === bm ? `${a.getYearInGanZhi()}年 ${am}` : `${a.getYearInGanZhi()}年 ${am} – ${bm}`;
}

import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ChevronLeft, ChevronRight, PenLine } from "lucide-react";
import { DiaryShell, RoundButton } from "./DiaryShell";
import { Lightbox } from "./DiaryToday";
import { addDays, isValidDate, lunarText, parts, solarText, todayStr, weekday, yearsAgo, type Mode } from "./dates";
import { useOnThisDay, type PastRow } from "./useOnThisDay";

export default function DiaryOnThisDay() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("date");
  const date = isValidDate(raw) ? raw : todayStr();
  const mode: Mode = params.get("mode") === "lunar" ? "lunar" : "solar";
  const go = (next: { date?: string; mode?: Mode }) =>
    navigate(`/diary/on-this-day?date=${next.date ?? date}&mode=${next.mode ?? mode}`, { replace: true });

  const { loading, firstDate, solar, lunar } = useOnThisDay(date);
  const rows = mode === "solar" ? solar : lunar;
  const written = rows.filter((r) => r.entry).length;
  const title = mode === "solar" ? solarText(date) : lunarText(date);
  const [viewing, setViewing] = useState<string | null>(null);

  return (
    <DiaryShell>
      <div className="flex flex-col gap-2.5">
        <div role="group" aria-label="按阳历或农历回顾" className="flex overflow-hidden rounded-sm border border-[var(--d-ink)]">
          {(["solar", "lunar"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => go({ mode: m })}
              className={`h-11 flex-1 cursor-pointer text-[14px] ${
                mode === m ? "bg-[var(--d-ink)] font-bold text-white" : "bg-[var(--d-card)] font-medium"
              }`}
            >
              {m === "solar" ? `阳历 ${solarText(date)}` : `农历 ${lunarText(date)}`}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <RoundButton label="前一天" onClick={() => go({ date: addDays(date, -1) })}>
            <ChevronLeft className="size-5" />
          </RoundButton>
          <h1 className="diary-serif m-0 text-[40px] leading-[1.1] font-bold">{title}</h1>
          <RoundButton label="后一天" onClick={() => go({ date: addDays(date, 1) })}>
            <ChevronRight className="size-5" />
          </RoundButton>
        </div>
        <div className="text-center text-[13px] text-[var(--d-muted)]">
          {loading ? "加载中…" : rows.length > 0 ? `过去 ${rows.length} 年的${mode === "lunar" ? "农历" : " "}${title}，有 ${written} 年写了日记` : `${parts(date).y}年 · ${weekday(date)}`}
        </div>
      </div>

      {!loading && rows.length === 0 ? (
        <p className="border-t-2 border-[var(--d-ink)] py-6 text-center text-[14px] leading-relaxed text-[var(--d-muted)]">
          {firstDate ? "往年还没有这一天的日记。" : "还没有日记。"}
          <br />
          写下今年的这一天，明年就能在这里看到它。
        </p>
      ) : (
        <div className="flex flex-col border-t-2 border-[var(--d-ink)]">
          {rows.map((row) => (
            <YearRow key={row.date} row={row} mode={mode} onView={setViewing} />
          ))}
        </div>
      )}

      <Link
        to={date === todayStr() ? "/diary" : `/diary?date=${date}`}
        className="flex min-h-12 items-center justify-center gap-1.5 rounded-sm border border-[var(--d-ink)] text-[14px] font-medium hover:bg-[var(--d-card)]"
      >
        <PenLine className="size-[18px]" />
        写下{parts(date).y === parts(todayStr()).y ? "今年" : ` ${parts(date).y} 年`}的这一天
      </Link>

      {viewing && <Lightbox url={viewing} onClose={() => setViewing(null)} />}
    </DiaryShell>
  );
}

function YearRow({ row, mode, onView }: { row: PastRow; mode: Mode; onView: (url: string) => void }) {
  const { entry } = row;
  return (
    <article className="flex gap-3.5 border-b border-[var(--d-line)] py-[18px]">
      <div className="flex w-[62px] flex-none flex-col gap-0.5 text-[12px] text-[var(--d-muted)]">
        <div className="diary-serif text-[22px] leading-[1.2] font-bold text-[var(--d-red)]">{parts(row.date).y}</div>
        <div>{yearsAgo(row.ago)}</div>
        {mode === "solar" ? (
          <>
            <div>{weekday(row.date)}</div>
            <div>{lunarText(row.date)}</div>
          </>
        ) : (
          <>
            <div>{solarText(row.date)}</div>
            <div>{weekday(row.date)}</div>
          </>
        )}
      </div>

      {entry ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {row.note && <div className="text-[12px] text-[var(--d-muted)]">（{row.note}，取 {solarText(row.date)}）</div>}
          {entry.content && (
            <p className="m-0 line-clamp-6 text-[15px] leading-[1.75] whitespace-pre-wrap">{entry.content}</p>
          )}
          {entry.photos.length > 0 && (
            <div className="flex gap-2">
              {entry.photos.slice(0, 3).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onView(p.url)}
                  className="diary-photo-placeholder h-[104px] min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-sm md:h-32"
                >
                  <img src={p.url} alt="日记照片" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}
          <Link
            to={`/diary?date=${row.date}`}
            className="flex min-h-11 items-center gap-0.5 self-start text-[13px] font-medium text-[var(--d-red)]"
          >
            阅读全文
            <ChevronRight className="size-4" />
          </Link>
        </div>
      ) : (
        <Link
          to={`/diary?date=${row.date}`}
          className="flex min-h-16 flex-1 items-center justify-center rounded-sm border border-dashed border-[var(--d-faint)] text-[13px] text-[var(--d-muted)] hover:border-[var(--d-ink)]"
        >
          这一天没有写日记{row.note ? `（${row.note}）` : ""}
        </Link>
      )}
    </article>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getEntriesOn, getFirstDate, type DiaryEntry } from "./api";
import { lunarPastDays, parts, solarPastDays, type PastDay } from "./dates";

export interface PastRow extends PastDay {
  entry: DiaryEntry | null;
}

export interface OnThisDay {
  loading: boolean;
  /** 最早一篇日记的日期；一篇都没有时为 null */
  firstDate: string | null;
  solar: PastRow[];
  lunar: PastRow[];
}

/** 往年的这一天（阳历、农历各一组），含没写的年份 */
export function useOnThisDay(date: string): OnThisDay {
  // 结果带上是哪一天的；和当前日期对不上就是还在加载
  const [state, setState] = useState<OnThisDay & { key: string | null }>({
    key: null,
    loading: true,
    firstDate: null,
    solar: [],
    lunar: [],
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const firstDate = await getFirstDate();
      if (!firstDate) return { loading: false, firstDate, solar: [], lunar: [] };
      const solarDays = solarPastDays(date, parts(firstDate).y);
      const lunarDays = lunarPastDays(date, firstDate);
      const dates = [...new Set([...solarDays, ...lunarDays].map((p) => p.date))];
      const entries = await getEntriesOn(dates);
      const byDate = new Map(entries.map((e) => [e.date, e]));
      const withEntry = (p: PastDay): PastRow => ({ ...p, entry: byDate.get(p.date) ?? null });
      return { loading: false, firstDate, solar: solarDays.map(withEntry), lunar: lunarDays.map(withEntry) };
    })()
      .then((next) => {
        if (!cancelled) setState({ ...next, key: date });
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof Error ? err.message : "加载往年日记失败");
        setState({ key: date, loading: false, firstDate: null, solar: [], lunar: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  if (state.key !== date) return { loading: true, firstDate: state.firstDate, solar: [], lunar: [] };
  return state;
}

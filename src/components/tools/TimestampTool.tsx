import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { ClickToCopy } from "../ClickToCopy";

export default function TimestampTool() {
  const [now, setNow] = useState(Date.now());
  const [tsInput, setTsInput] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [tsLocalResult, setTsLocalResult] = useState("");
  const [tsISOResult, setTsISOResult] = useState("");
  const [dateResultS, setDateResultS] = useState("");
  const [dateResultMs, setDateResultMs] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentTs = Math.floor(now / 1000);
  const currentDate = new Date(now);

  const convertTs = useCallback((val?: string) => {
    const v = val ?? tsInput;
    const n = parseInt(v);
    if (!v.trim() || isNaN(n)) {
      setTsLocalResult("");
      setTsISOResult("");
      return;
    }
    const ms = String(n).length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    if (isNaN(d.getTime())) {
      setTsLocalResult("无效时间戳");
      setTsISOResult("");
      return;
    }
    setTsLocalResult(d.toLocaleString("zh-CN", { hour12: false }));
    setTsISOResult(d.toISOString());
  }, [tsInput]);

  const convertDate = useCallback((val?: string) => {
    const v = val ?? dateInput;
    if (!v.trim()) {
      setDateResultS("");
      setDateResultMs("");
      return;
    }
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      setDateResultS("无效日期");
      setDateResultMs("");
      return;
    }
    setDateResultS(String(Math.floor(d.getTime() / 1000)));
    setDateResultMs(String(d.getTime()));
  }, [dateInput]);

  return (
    <ToolPage title="时间戳转换" description="Unix 时间戳与日期互转，自动识别秒/毫秒" icon={<Clock className="w-5 h-5" />}>
      {/* Live clock */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 md:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <div>
          <p className="text-[12px] text-muted-foreground mb-1">当前时间</p>
          <p className="text-[14px] md:text-[16px] tabular-nums">{currentDate.toLocaleString("zh-CN", { hour12: false })}</p>
        </div>
        <ClickToCopy text={String(currentTs)} className="rounded-lg hover:bg-muted/60 px-2 py-1 -mx-2 -my-1 w-auto">
          <p className="text-[12px] text-muted-foreground mb-1">Unix 时间戳（秒）</p>
          <p className="text-[14px] md:text-[16px] tabular-nums">{currentTs}</p>
        </ClickToCopy>
        <ClickToCopy text={String(now)} className="rounded-lg hover:bg-muted/60 px-2 py-1 -mx-2 -my-1 w-auto">
          <p className="text-[12px] text-muted-foreground mb-1">毫秒</p>
          <p className="text-[14px] md:text-[16px] tabular-nums">{now}</p>
        </ClickToCopy>
      </div>

      {/* Timestamp to Date */}
      <div className="rounded-xl border border-border p-5 space-y-3">
        <p className="text-[14px]">时间戳 → 日期 <span className="text-muted-foreground text-[12px] ml-1">自动识别 10位(秒) / 13位(毫秒)</span></p>
        <div className="relative">
          <input
            value={tsInput}
            onChange={(e) => { setTsInput(e.target.value); convertTs(e.target.value); }}
            onBlur={() => convertTs()}
            onKeyDown={(e) => e.key === "Enter" && convertTs()}
            placeholder="输入时间戳，如 1742391744 或 1742391744915"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
          />
          {tsInput.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground tabular-nums">
              {tsInput.trim().length} 位
            </span>
          )}
        </div>
        {tsLocalResult && (
          <div className="space-y-2">
            <ClickToCopy text={tsLocalResult} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted-foreground mb-0.5">本地时间</p>
                <p className="text-[14px] font-mono truncate">{tsLocalResult}</p>
              </div>
            </ClickToCopy>
            {tsISOResult && (
              <ClickToCopy text={tsISOResult} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-muted-foreground mb-0.5">ISO 8601</p>
                  <p className="text-[14px] font-mono truncate">{tsISOResult}</p>
                </div>
              </ClickToCopy>
            )}
          </div>
        )}
      </div>

      {/* Date to Timestamp */}
      <div className="rounded-xl border border-border p-5 space-y-3">
        <p className="text-[14px]">日期 → 时间戳</p>
        <input
          value={dateInput}
          onChange={(e) => { setDateInput(e.target.value); convertDate(e.target.value); }}
          onBlur={() => convertDate()}
          onKeyDown={(e) => e.key === "Enter" && convertDate()}
          placeholder="如 2026-03-19 12:00:00"
          className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
        />
        {dateResultS && (
          <div className="space-y-2">
            <ClickToCopy text={dateResultS} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-muted-foreground mb-0.5">秒</p>
                <p className="text-[14px] font-mono truncate">{dateResultS}</p>
              </div>
            </ClickToCopy>
            {dateResultMs && (
              <ClickToCopy text={dateResultMs} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-muted-foreground mb-0.5">毫秒</p>
                  <p className="text-[14px] font-mono truncate">{dateResultMs}</p>
                </div>
              </ClickToCopy>
            )}
          </div>
        )}
      </div>
    </ToolPage>
  );
}

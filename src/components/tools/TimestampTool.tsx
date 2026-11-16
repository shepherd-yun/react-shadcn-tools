import { useState, useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { ClickToCopy } from "../ClickToCopy";
import { parseTimestamp, formatLocal, formatDuration } from "@/lib/time";

/** 保留最多 4 位小数并去掉末尾 0 */
function trimNum(n: number): string {
  return String(Number(n.toFixed(4)));
}

function TsRow({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const d = parseTimestamp(value);
  const invalid = value.trim() !== "" && !d;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-6 h-6 shrink-0 rounded-md bg-muted text-[12px] font-medium flex items-center justify-center">{label}</span>
        <div className="relative flex-1">
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-muted/50 text-[14px] placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
          />
          {value.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted-foreground tabular-nums">
              {value.trim().length} 位
            </span>
          )}
        </div>
      </div>
      {invalid && <p className="pl-8 text-[13px] text-destructive">无效时间戳</p>}
      {d && (
        <div className="pl-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <ClickToCopy text={formatLocal(d)} className="px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
            <p className="text-[12px] text-muted-foreground mb-0.5">本地时间</p>
            <p className="text-[14px] font-mono truncate">{formatLocal(d)}</p>
          </ClickToCopy>
          <ClickToCopy text={d.toISOString()} className="px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
            <p className="text-[12px] text-muted-foreground mb-0.5">ISO 8601</p>
            <p className="text-[14px] font-mono truncate">{d.toISOString()}</p>
          </ClickToCopy>
        </div>
      )}
    </div>
  );
}

export default function TimestampTool() {
  const [now, setNow] = useState(() => Date.now());
  const [tsA, setTsA] = useState("");
  const [tsB, setTsB] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [dateResultS, setDateResultS] = useState("");
  const [dateResultMs, setDateResultMs] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const currentTs = Math.floor(now / 1000);
  const currentDate = new Date(now);

  const dateA = parseTimestamp(tsA);
  const dateB = parseTimestamp(tsB);
  const diffMs = dateA && dateB ? dateB.getTime() - dateA.getTime() : null;

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

      {/* Timestamp to Date：两组同时转换 + 差值 */}
      <div className="rounded-xl border border-border p-5 space-y-4">
        <p className="text-[14px]">时间戳 → 日期 <span className="text-muted-foreground text-[12px] ml-1">自动识别 10位(秒) / 13位(毫秒)，填两组可算时间差</span></p>
        <TsRow label="A" value={tsA} onChange={setTsA} placeholder="输入时间戳，如 1742391744 或 1742391744915" />
        <TsRow label="B" value={tsB} onChange={setTsB} placeholder="再输入一个时间戳，计算与 A 的差值" />
        {diffMs !== null && (
          <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
            <p className="text-[12px] text-muted-foreground">
              时间差（B − A）<span className="ml-1.5">{diffMs === 0 ? "相同时间" : diffMs > 0 ? "B 晚于 A" : "B 早于 A"}</span>
            </p>
            <ClickToCopy text={formatDuration(diffMs)} className="px-3 py-2.5 rounded-lg bg-muted/40 hover:bg-muted/60">
              <p className="text-[16px] font-medium tabular-nums">{diffMs < 0 ? "−" : ""}{formatDuration(diffMs)}</p>
            </ClickToCopy>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { k: "秒", v: trimNum(diffMs / 1000) },
                { k: "毫秒", v: String(diffMs) },
                { k: "小时", v: trimNum(diffMs / 3600000) },
                { k: "天", v: trimNum(diffMs / 86400000) },
              ].map(({ k, v }) => (
                <ClickToCopy key={k} text={v} className="px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/60">
                  <p className="text-[12px] text-muted-foreground mb-0.5">{k}</p>
                  <p className="text-[14px] font-mono truncate">{v}</p>
                </ClickToCopy>
              ))}
            </div>
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

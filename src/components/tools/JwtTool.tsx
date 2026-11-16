import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { CopyButton } from "../CopyButton";
import { ClickToCopy } from "../ClickToCopy";
import { formatDuration, formatLocal, formatRelative } from "@/lib/time";

/** JWT 标准中以秒级 Unix 时间戳表示的字段 */
const TIME_CLAIMS: { key: string; label: string }[] = [
  { key: "iat", label: "签发时间" },
  { key: "nbf", label: "生效时间" },
  { key: "exp", label: "过期时间" },
  { key: "auth_time", label: "认证时间" },
];

function claimDate(v: unknown): Date | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  const d = new Date(v * 1000);
  return isNaN(d.getTime()) ? null : d;
}

function decodeJwt(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("无效的 JWT 格式（需要 3 段）");
  const decode = (s: string) => {
    const base64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(base64))));
  };
  return { header: decode(parts[0]), payload: decode(parts[1]), signature: parts[2] };
}

export default function JwtTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{ header: Record<string, unknown>; payload: Record<string, unknown>; signature: string } | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  // 有解析结果时每秒刷新，让「多久后过期」和过期状态保持实时
  useEffect(() => {
    if (!result) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [result]);

  const parse = (text: string) => {
    setInput(text);
    if (!text.trim()) { setResult(null); setError(""); return; }
    try {
      setResult(decodeJwt(text.trim()));
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message);
      setResult(null);
    }
  };

  const renderExpiry = () => {
    if (!result?.payload?.exp) return null;
    const exp = new Date((result.payload.exp as number) * 1000);
    const expired = exp.getTime() < now;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] ${expired ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-destructive" : "bg-emerald-500"}`} />
        {expired ? "已过期" : "未过期"} · {formatLocal(exp)}
      </div>
    );
  };

  const renderTimeClaims = () => {
    if (!result) return null;
    const rows = TIME_CLAIMS.flatMap(({ key, label }) => {
      const d = claimDate(result.payload[key]);
      return d ? [{ key, label, d }] : [];
    });
    if (rows.length === 0) return null;
    const iat = claimDate(result.payload.iat);
    const exp = claimDate(result.payload.exp);
    return (
      <div className="space-y-2">
        <span className="text-[12px] text-muted-foreground">时间字段</span>
        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
          {rows.map(({ key, label, d }) => (
            <ClickToCopy key={key} text={formatLocal(d)} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2.5 hover:bg-muted/40">
              <span className="w-[88px] shrink-0 text-[13px]">
                <span className="font-mono">{key}</span>
                <span className="text-muted-foreground text-[12px] ml-1.5">{label}</span>
              </span>
              <span className="text-[14px] font-mono tabular-nums">{formatLocal(d)}</span>
              <span className="ml-auto text-[12px] text-muted-foreground tabular-nums">{formatRelative(d, now)}</span>
            </ClickToCopy>
          ))}
          {iat && exp && (
            <div className="flex flex-wrap items-baseline gap-x-3 px-4 py-2.5 bg-muted/20">
              <span className="w-[88px] shrink-0 text-[12px] text-muted-foreground">有效期</span>
              <span className="text-[14px] tabular-nums">{formatDuration(exp.getTime() - iat.getTime())}</span>
              <span className="ml-auto text-[12px] text-muted-foreground">exp − iat</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <ToolPage title="JWT 解析" description="解析 JWT Token" icon={<KeyRound className="w-5 h-5" />}>
      <textarea
        value={input}
        onChange={(e) => parse(e.target.value)}
        rows={4}
        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
        placeholder="粘贴 JWT Token..."
      />

      {error && (
        <div className="px-4 py-3 rounded-xl bg-destructive/5 border border-destructive/20 text-[13px] text-destructive">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {renderExpiry()}
          {renderTimeClaims()}
          {[
            { label: "Header", data: result.header },
            { label: "Payload", data: result.payload },
          ].map(({ label, data }) => {
            const json = JSON.stringify(data, null, 2);
            return (
              <div key={label} className="space-y-2">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <div className="relative group">
                  <pre className="px-4 py-3 pr-14 rounded-xl border border-border bg-muted/20 text-[13px] md:text-[14px] font-mono overflow-x-auto whitespace-pre-wrap break-all selection:bg-primary/20">
                    {json}
                  </pre>
                  <div className="absolute top-2 right-2">
                    <CopyButton text={json} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ToolPage>
  );
}

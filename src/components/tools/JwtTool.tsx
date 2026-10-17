import { useState } from "react";
import { KeyRound } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { CopyButton } from "../CopyButton";

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
    const expired = exp < new Date();
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] ${expired ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-600"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-destructive" : "bg-emerald-500"}`} />
        {expired ? "已过期" : "未过期"} · {exp.toLocaleString("zh-CN")}
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

import { useState } from "react";
import { Link, Copy, Check, Eraser } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { copyToClipboard } from "../copyUtil";
import { toast } from "sonner";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    copyToClipboard(text);
    toast("已复制到剪贴板");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="absolute right-2 top-2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer transition-colors"
      title="复制"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function UrlTool() {
  const [encoded, setEncoded] = useState("");
  const [decoded, setDecoded] = useState("");

  const encode = (text: string) => {
    try { return encodeURI(text); } catch { return "转换失败"; }
  };
  const decode = (text: string) => {
    try { return decodeURI(text); } catch { return "转换失败"; }
  };

  const handleEncodedChange = (text: string) => {
    setEncoded(text);
    if (!text) { setDecoded(""); return; }
    setDecoded(decode(text));
  };

  const handleDecodedChange = (text: string) => {
    setDecoded(text);
    if (!text) { setEncoded(""); return; }
    setEncoded(encode(text));
  };

  const clear = () => { setEncoded(""); setDecoded(""); };

  return (
    <ToolPage title="URL 编解码" description="URL 编码与解码，支持完整 URL" icon={<Link className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-muted-foreground">编码后的 URL</label>
            <button
              onClick={clear}
              className="px-2.5 py-1 rounded-md text-[12px] cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Eraser className="w-3 h-3" /> 清空
            </button>
          </div>
          <div className="relative">
            <textarea
              value={encoded}
              onChange={(e) => handleEncodedChange(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="输入或粘贴编码后的 URL..."
            />
            <CopyButton text={encoded} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] text-muted-foreground">明文（解码后）</label>
          <div className="relative">
            <textarea
              value={decoded}
              onChange={(e) => handleDecodedChange(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="输入明文或 URL..."
            />
            <CopyButton text={decoded} />
          </div>
        </div>
      </div>
    </ToolPage>
  );
}

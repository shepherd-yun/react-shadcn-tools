import { useState } from "react";
import { FileCode, Copy, Check, Eraser } from "lucide-react";
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

export default function Base64Tool() {
  const [plain, setPlain] = useState("");
  const [base64, setBase64] = useState("");

  const encode = (text: string) => {
    try { return btoa(unescape(encodeURIComponent(text))); } catch { return "转换失败：输入格式有误"; }
  };
  const decode = (text: string) => {
    try { return decodeURIComponent(escape(atob(text))); } catch { return "转换失败：输入格式有误"; }
  };

  const handlePlainChange = (text: string) => {
    setPlain(text);
    if (!text) { setBase64(""); return; }
    setBase64(encode(text));
  };

  const handleBase64Change = (text: string) => {
    setBase64(text);
    if (!text) { setPlain(""); return; }
    setPlain(decode(text));
  };

  const clear = () => { setPlain(""); setBase64(""); };

  return (
    <ToolPage title="Base64 编解码" description="Base64 编码与解码" icon={<FileCode className="w-5 h-5" />}>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] text-muted-foreground">明文</label>
            <button
              onClick={clear}
              className="px-2.5 py-1 rounded-md text-[12px] cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              <Eraser className="w-3 h-3" /> 清空
            </button>
          </div>
          <div className="relative">
            <textarea
              value={plain}
              onChange={(e) => handlePlainChange(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="输入要编码的文本..."
            />
            <CopyButton text={plain} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[12px] text-muted-foreground">Base64</label>
          <div className="relative">
            <textarea
              value={base64}
              onChange={(e) => handleBase64Change(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="输入 Base64 字符串..."
            />
            <CopyButton text={base64} />
          </div>
        </div>
      </div>
    </ToolPage>
  );
}

import { useState } from "react";
import { Hash, Copy, Check } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { copyToClipboard } from "../copyUtil";
import { toast } from "sonner";

const bases = [
  { label: "十进制", value: 10, prefix: "" },
  { label: "二进制", value: 2, prefix: "0b" },
  { label: "八进制", value: 8, prefix: "0o" },
  { label: "十六进制", value: 16, prefix: "0x" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;
    copyToClipboard(text);
    toast("已复制到剪贴板");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer transition-colors shrink-0"
      title="复制"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function stripPrefix(value: string, base: number): string {
  const v = value.trim();
  if (base === 2 && v.toLowerCase().startsWith("0b")) return v.slice(2);
  if (base === 8 && v.toLowerCase().startsWith("0o")) return v.slice(2);
  if (base === 16 && v.toLowerCase().startsWith("0x")) return v.slice(2);
  return v;
}

export default function NumberBaseTool() {
  // Store raw digits (no prefix) for each base
  const [values, setValues] = useState<Record<number, string>>({ 2: "", 8: "", 10: "", 16: "" });

  const updateFromBase = (fromBase: number, rawInput: string) => {
    const digits = stripPrefix(rawInput, fromBase);
    const next: Record<number, string> = { ...values, [fromBase]: digits };

    if (!digits) {
      setValues({ 2: "", 8: "", 10: "", 16: "" });
      return;
    }

    const num = parseInt(digits, fromBase);
    if (isNaN(num)) {
      // Only update the edited field; clear others
      setValues({ 2: "", 8: "", 10: "", 16: "", [fromBase]: digits });
      return;
    }

    for (const b of bases) {
      if (b.value !== fromBase) {
        next[b.value] = num.toString(b.value).toUpperCase();
      }
    }
    setValues(next);
  };

  return (
    <ToolPage title="进制转换" description="二进制、八进制、十进制、十六进制互转" icon={<Hash className="w-5 h-5" />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {bases.map((b) => {
          const displayValue = values[b.value] ? b.prefix + values[b.value] : "";
          return (
            <div key={b.value} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] text-muted-foreground">{b.label}</label>
                <CopyButton text={displayValue} />
              </div>
              <input
                value={displayValue}
                onChange={(e) => {
                  const raw = e.target.value;
                  updateFromBase(b.value, raw);
                }}
                placeholder={b.prefix ? `${b.prefix}...` : "输入数字..."}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-[15px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              />
            </div>
          );
        })}
      </div>
    </ToolPage>
  );
}

import { useState, useEffect, useRef, useCallback } from "react";
import { CaseSensitive, Check, Languages, Loader2 } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { copyToClipboard } from "../copyUtil";
import { toast } from "sonner";

function toWords(str: string): string[] {
  return str
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const converters = [
  { label: "camelCase", fn: (w: string[]) => w.map((s, i) => (i === 0 ? s : s[0].toUpperCase() + s.slice(1))).join("") },
  { label: "PascalCase", fn: (w: string[]) => w.map((s) => s[0].toUpperCase() + s.slice(1)).join("") },
  { label: "snake_case", fn: (w: string[]) => w.join("_") },
  { label: "kebab-case", fn: (w: string[]) => w.join("-") },
  { label: "SCREAMING_SNAKE", fn: (w: string[]) => w.map((s) => s.toUpperCase()).join("_") },
  { label: "SCREAMING-KEBAB", fn: (w: string[]) => w.map((s) => s.toUpperCase()).join("-") },
  { label: "Title Case", fn: (w: string[]) => w.map((s) => s[0].toUpperCase() + s.slice(1)).join(" ") },
  { label: "lower case", fn: (w: string[]) => w.join(" ") },
];

function isChinese(str: string): boolean {
  return /[\u4e00-\u9fff]/.test(str);
}

async function translateText(text: string, from: string, to: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
    );
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return "";
  } catch {
    return "";
  }
}

export default function CaseConverterTool() {
  const [input, setInput] = useState("");
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [zhTranslation, setZhTranslation] = useState("");
  const [enTranslation, setEnTranslation] = useState("");
  const [enWords, setEnWords] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doTranslate = useCallback(async (text: string) => {
    if (!text.trim()) {
      setZhTranslation("");
      setEnTranslation("");
      setEnWords([]);
      return;
    }

    const hasCh = isChinese(text.trim());
    setTranslating(true);

    if (hasCh) {
      const en = await translateText(text.trim(), "zh", "en");
      if (en) {
        setEnTranslation(en);
        setEnWords(toWords(en));
        setZhTranslation("");
      } else {
        setEnTranslation("");
        setEnWords([]);
      }
    } else {
      const words = toWords(text.trim());
      setEnWords(words);
      setEnTranslation("");
      const joined = words.join(" ");
      const zh = await translateText(joined, "en", "zh");
      setZhTranslation(zh || "");
    }

    setTranslating(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doTranslate(input), 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, doTranslate]);

  const words = enWords;

  const handleCopy = (result: string, label: string) => {
    copyToClipboard(result);
    toast("已复制到剪贴板");
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 1500);
  };

  return (
    <ToolPage title="命名转换" description="驼峰、下划线等命名互转 + 中英翻译，点击即可复制" icon={<CaseSensitive className="w-5 h-5" />}>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入命名，如 myVariableName..."
        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-[14px] md:text-[15px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
      />

      {(zhTranslation || enTranslation || translating) && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <Languages className="w-4 h-4" />
            <span>翻译参考</span>
            {translating && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />}
          </div>
          {zhTranslation && (
            <TranslationCard
              label="中文翻译"
              result={zhTranslation}
              isCopied={copiedLabel === "__zh"}
              onCopy={() => handleCopy(zhTranslation, "__zh")}
            />
          )}
          {enTranslation && (
            <TranslationCard
              label="英文翻译"
              result={enTranslation}
              isCopied={copiedLabel === "__en"}
              onCopy={() => handleCopy(enTranslation, "__en")}
            />
          )}
        </div>
      )}

      {words.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {converters.map((c) => {
            const result = c.fn(words);
            const isCopied = copiedLabel === c.label;
            return (
              <button
                key={c.label}
                onClick={() => handleCopy(result, c.label)}
                className={`text-left px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer group overflow-hidden
                  ${isCopied
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/30 hover:border-primary/20"
                  }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`text-[12px] ${isCopied ? "text-primary" : "text-muted-foreground"}`}>{c.label}</p>
                  {isCopied && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </div>
                <p className="text-[14px] md:text-[15px] font-mono mt-0.5 truncate">{result}</p>
              </button>
            );
          })}
        </div>
      )}
    </ToolPage>
  );
}

function TranslationCard({ label, result, isCopied, onCopy }: { label: string; result: string; isCopied: boolean; onCopy: () => void }) {
  return (
    <button
      onClick={onCopy}
      className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between
        ${isCopied ? "border-primary/40 bg-primary/5" : "border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06]"}`}
    >
      <div>
        <p className={`text-[12px] ${isCopied ? "text-primary" : "text-primary/70"}`}>{label}</p>
        <p className="text-[15px] mt-0.5">{result}</p>
      </div>
      {isCopied && <Check className="w-3.5 h-3.5 text-primary" />}
    </button>
  );
}

import { useState, useRef, useCallback } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { QrCode, Download, Palette } from "lucide-react";
import { ToolPage } from "../ToolPage";
import { toast } from "sonner";

const sizes = [
  { label: "小", value: 160 },
  { label: "中", value: 256 },
  { label: "大", value: 400 },
];

const fgColors = [
  { label: "黑色", value: "#000000" },
  { label: "橙色", value: "#e07b3c" },
  { label: "深蓝", value: "#1e3a5f" },
  { label: "深绿", value: "#1a5c2a" },
  { label: "紫色", value: "#5b21b6" },
];

function isUrl(str: string): boolean {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function QrCodeTool() {
  const [input, setInput] = useState("");
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState("#000000");
  const canvasRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.png";
    a.click();
    toast("已下载二维码");
  }, []);

  const text = input.trim();
  const urlDetected = isUrl(text);

  return (
    <ToolPage
      title="二维码生成"
      description="输入文本或 URL 生成二维码，URL 可扫码直接跳转"
      icon={<QrCode className="w-5 h-5" />}
    >
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="输入文本或 URL，如 https://example.com"
        className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-[15px] font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
      />

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-muted-foreground">尺寸</span>
          <div className="flex gap-1">
            {sizes.map((s) => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                className={`px-3 py-1 rounded-lg text-[13px] cursor-pointer transition-all duration-150
                  ${size === s.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1.5">
            {fgColors.map((c) => (
              <button
                key={c.value}
                onClick={() => setFgColor(c.value)}
                title={c.label}
                className={`w-6 h-6 rounded-full cursor-pointer transition-all duration-150 border-2
                  ${fgColor === c.value ? "border-primary scale-110" : "border-transparent hover:scale-105"}`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>
      </div>

      {text && (
        <div className="space-y-4">
          {urlDetected && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] bg-primary/10 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              检测到 URL · 扫码可直接跳转
            </div>
          )}

          <div className="flex flex-col items-center gap-4 py-6 rounded-xl border border-border bg-white overflow-hidden">
            <div ref={canvasRef} className="max-w-full px-4" style={{ maxWidth: size + 32 }}>
              <QRCodeCanvas
                value={text}
                size={size}
                fgColor={fgColor}
                bgColor="#ffffff"
                level="M"
                marginSize={2}
                style={{ width: "100%", height: "auto" }}
              />
            </div>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-[14px] cursor-pointer hover:opacity-90 transition-opacity"
            >
              <Download className="w-4 h-4" />
              下载 PNG
            </button>
          </div>
        </div>
      )}
    </ToolPage>
  );
}

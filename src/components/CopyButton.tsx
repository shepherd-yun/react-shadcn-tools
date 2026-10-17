import { toast } from "sonner";
import { copyToClipboard } from "./copyUtil";
import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CopyButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function CopyButton({ text, className = "", label }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(text);
    setCopied(true);
    toast("已复制到剪贴板");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[13px] cursor-pointer
        transition-all duration-200
        ${copied
          ? "bg-primary/10 text-primary border border-primary/30"
          : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
        } ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {label && <span>{copied ? "已复制" : label}</span>}
    </button>
  );
}

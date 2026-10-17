import { useState } from "react";
import { Check } from "lucide-react";
import { copyToClipboard } from "./copyUtil";
import { toast } from "sonner";

interface ClickToCopyProps {
  text: string;
  children: React.ReactNode;
  className?: string;
}

export function ClickToCopy({ text, children, className = "" }: ClickToCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    if (!text) return;
    copyToClipboard(text);
    toast("已复制到剪贴板");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      className={`text-left w-full cursor-pointer transition-all duration-200 relative ${
        copied ? "ring-1 ring-primary bg-primary/5" : ""
      } ${className}`}
    >
      {children}
      {copied && (
        <span className="absolute top-2 right-2">
          <Check className="w-3.5 h-3.5 text-primary" />
        </span>
      )}
    </button>
  );
}

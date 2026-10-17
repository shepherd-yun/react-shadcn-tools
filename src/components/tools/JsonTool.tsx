import { useState, useCallback, useRef } from "react";
import {
  Braces,
  Trash2,
  Shrink,
  WrapText,
  Download,
  Copy,
  ChevronsDownUp,
  ChevronsUpDown,
  List,
  Check,
} from "lucide-react";
import { ToolPage } from "../ToolPage";
import JsonTreeView from "./json/JsonTreeView";

const SAMPLE_PLACEHOLDER = `{
  "name": "示例",
  "version": "1.0.0",
  "description": "在此输入或粘贴 JSON"
}`;

export default function JsonTool() {
  const [input, setInput] = useState("");
  const [parsedData, setParsedData] = useState<unknown>(null);
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);
  const [isCompressed, setIsCompressed] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);
  const [treeKey, setTreeKey] = useState(0);

  // Undo history
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback((text: string) => {
    const h = historyRef.current;
    const idx = historyIndexRef.current;
    // Trim future history if we're not at the end
    historyRef.current = h.slice(0, idx + 1);
    historyRef.current.push(text);
    if (historyRef.current.length > 100) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
  }, []);

  const tryParse = useCallback((text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      setError("");
      return;
    }
    try {
      const obj = JSON.parse(text);
      setParsedData(obj);
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message);
      setParsedData(null);
    }
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInput(val);
      pushHistory(val);
      tryParse(val);
      setIsCompressed(false);
    },
    [pushHistory, tryParse],
  );

  // Cmd+Z / Ctrl+Z undo for the textarea
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const idx = historyIndexRef.current;
        if (idx > 0) {
          historyIndexRef.current = idx - 1;
          const prev = historyRef.current[idx - 1];
          setInput(prev);
          tryParse(prev);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        const idx = historyIndexRef.current;
        if (idx < historyRef.current.length - 1) {
          historyIndexRef.current = idx + 1;
          const next = historyRef.current[idx + 1];
          setInput(next);
          tryParse(next);
        }
      }
    },
    [tryParse],
  );

  const handleFormat = useCallback(() => {
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      const formatted = JSON.stringify(obj, null, indent);
      setInput(formatted);
      pushHistory(formatted);
      setParsedData(obj);
      setError("");
      setIsCompressed(false);
      setIsAllCollapsed(false);
      setTreeKey((k) => k + 1);
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [input, indent, pushHistory]);

  const handleCompress = useCallback(() => {
    if (!input.trim()) return;
    try {
      const obj = JSON.parse(input);
      if (isCompressed) {
        const formatted = JSON.stringify(obj, null, indent);
        setInput(formatted);
        pushHistory(formatted);
        setIsCompressed(false);
      } else {
        const compressed = JSON.stringify(obj);
        setInput(compressed);
        pushHistory(compressed);
        setIsCompressed(true);
      }
      setParsedData(obj);
      setError("");
    } catch (e: unknown) {
      setError((e as Error).message);
    }
  }, [input, isCompressed, indent, pushHistory]);

  const handleToggleCollapse = useCallback(() => {
    const next = !isAllCollapsed;
    setIsAllCollapsed(next);
    setTreeKey((k) => k + 1);
  }, [isAllCollapsed]);

  const handleClear = useCallback(() => {
    setInput("");
    setParsedData(null);
    setError("");
    setIsCompressed(false);
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  const handleCopy = useCallback(async () => {
    if (!parsedData) return;
    const text = isCompressed
      ? JSON.stringify(parsedData)
      : JSON.stringify(parsedData, null, indent);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [parsedData, isCompressed, indent]);

  const handleDownload = useCallback(() => {
    if (!parsedData) return;
    const text = JSON.stringify(parsedData, null, indent);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [parsedData, indent]);

  // When tree view edits data, sync back to left panel
  const handleDataChange = useCallback(
    (newData: unknown) => {
      setParsedData(newData);
      const text = JSON.stringify(newData, null, indent);
      setInput(text);
      pushHistory(text);
    },
    [indent, pushHistory],
  );

  const btnClass =
    "p-1.5 rounded-md cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-default";

  return (
    <ToolPage
      title="JSON 格式化"
      description="JSON 格式化、压缩、校验与可视化，点击右侧属性可编辑"
      icon={<Braces className="w-5 h-5" />}
    >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-border rounded-xl overflow-hidden" style={{ minHeight: "calc(100vh - 180px)" }}>
          {/* Left Panel - Raw editor, no toolbar */}
          <div className="flex flex-col border-b lg:border-b-0 lg:border-r border-border">
            <div className="flex items-center px-3 h-10 border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground font-medium">JSON</span>
            </div>
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="flex-1 w-full px-4 py-3 text-[13px] md:text-[14px] font-mono resize-none bg-background placeholder:text-muted-foreground/40 focus:outline-none min-h-[250px] lg:min-h-0"
              placeholder={SAMPLE_PLACEHOLDER}
              spellCheck={false}
            />
          </div>

          {/* Right Panel - Viewer with toolbar */}
          <div className="flex flex-col">
            <div className="flex items-center gap-0.5 px-3 h-10 border-b border-border bg-muted/30">
              <span className="text-xs text-muted-foreground font-medium mr-auto">可视化</span>
              <div className="flex items-center gap-0.5 mr-1">
                <span className="text-[11px] text-muted-foreground mr-0.5">缩进:</span>
                {[2, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setIndent(n)}
                    className={`w-5 h-5 rounded text-[11px] cursor-pointer transition-colors ${
                      indent === n
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={handleFormat} className="px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-default" disabled={!input.trim()}>
                格式化
              </button>
              <button onClick={handleCompress} className={btnClass} title={isCompressed ? "展开" : "压缩"} disabled={!parsedData}>
                {isCompressed ? <WrapText className="w-3.5 h-3.5" /> : <Shrink className="w-3.5 h-3.5" />}
              </button>
              <button onClick={handleToggleCollapse} className={btnClass} title={isAllCollapsed ? "展开全部" : "折叠全部"} disabled={!parsedData}>
                {isAllCollapsed ? <ChevronsUpDown className="w-3.5 h-3.5" /> : <ChevronsDownUp className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setShowLineNumbers((s) => !s)}
                className={`${btnClass} ${showLineNumbers ? "text-foreground bg-muted" : ""}`}
                title={showLineNumbers ? "隐藏行号" : "显示行号"}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button onClick={handleCopy} className={btnClass} title="复制" disabled={!parsedData}>
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button onClick={handleDownload} className={btnClass} title="下载 JSON 文件" disabled={!parsedData}>
                <Download className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleClear} className={btnClass} title="清空" disabled={!input}>
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto px-4 py-3 bg-background min-h-[250px] lg:min-h-0">
              {parsedData !== null ? (
                <JsonTreeView
                  key={treeKey}
                  data={parsedData}
                  showLineNumbers={showLineNumbers}
                  defaultCollapsed={isAllCollapsed}
                  onDataChange={handleDataChange}
                />
              ) : error ? (
                <div className="px-3 py-2 rounded-lg bg-destructive/5 border border-destructive/20 text-[13px] text-destructive break-all">
                  <span className="font-medium">JSON 解析错误：</span>{error}
                </div>
              ) : (
                <div className="text-muted-foreground/40 text-sm pt-2">
                  在左侧输入 JSON 后自动解析显示
                </div>
              )}
            </div>
          </div>
        </div>
    </ToolPage>
  );
}

import { useState, useMemo } from "react";
import { GitCompareArrows, Eraser, Copy, Check } from "lucide-react";
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

/* ---------- Diff Algorithm (Myers) ---------- */
interface DiffLine {
  type: "equal" | "add" | "remove";
  text: string;
  leftNum?: number;
  rightNum?: number;
}

function computeDiff(a: string, b: string): DiffLine[] {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  const n = aLines.length;
  const m = bLines.length;

  // LCS-based diff for correctness
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (aLines[i - 1] === bLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = n, j = m;
  const stack: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      stack.push({ type: "equal", text: aLines[i - 1], leftNum: i, rightNum: j });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "add", text: bLines[j - 1], rightNum: j });
      j--;
    } else {
      stack.push({ type: "remove", text: aLines[i - 1], leftNum: i });
      i--;
    }
  }

  while (stack.length) result.push(stack.pop()!);
  return result;
}

/* ---------- Inline char diff for changed lines ---------- */
interface CharSpan {
  text: string;
  highlight: boolean;
}

function charDiff(a: string, b: string): { left: CharSpan[]; right: CharSpan[] } {
  const n = a.length, m = b.length;
  // For very long lines, skip char diff
  if (n * m > 500000) {
    return {
      left: [{ text: a, highlight: true }],
      right: [{ text: b, highlight: true }],
    };
  }

  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const ops: Array<{ type: "eq" | "del" | "ins"; aChar?: string; bChar?: string }> = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      ops.push({ type: "eq", aChar: a[i - 1], bChar: b[j - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      ops.push({ type: "ins", bChar: b[j - 1] });
      j--;
    } else {
      ops.push({ type: "del", aChar: a[i - 1] });
      i--;
    }
  }
  ops.reverse();

  const left: CharSpan[] = [];
  const right: CharSpan[] = [];

  let leftBuf = "", rightBuf = "";
  let leftHi = false, rightHi = false;

  const flushLeft = (hi: boolean) => {
    if (leftBuf) { left.push({ text: leftBuf, highlight: leftHi }); leftBuf = ""; }
    leftHi = hi;
  };
  const flushRight = (hi: boolean) => {
    if (rightBuf) { right.push({ text: rightBuf, highlight: rightHi }); rightBuf = ""; }
    rightHi = hi;
  };

  for (const op of ops) {
    if (op.type === "eq") {
      if (leftHi) flushLeft(false);
      if (rightHi) flushRight(false);
      leftBuf += op.aChar;
      rightBuf += op.bChar;
    } else if (op.type === "del") {
      if (!leftHi) flushLeft(true);
      leftBuf += op.aChar;
    } else {
      if (!rightHi) flushRight(true);
      rightBuf += op.bChar;
    }
  }
  if (leftBuf) left.push({ text: leftBuf, highlight: leftHi });
  if (rightBuf) right.push({ text: rightBuf, highlight: rightHi });

  return { left, right };
}

/* ---------- Component ---------- */
export default function DiffTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");

  const diffLines = useMemo(() => {
    if (!left && !right) return [];
    return computeDiff(left, right);
  }, [left, right]);

  const hasDiff = left !== "" || right !== "";
  const stats = useMemo(() => {
    const added = diffLines.filter((l) => l.type === "add").length;
    const removed = diffLines.filter((l) => l.type === "remove").length;
    const equal = diffLines.filter((l) => l.type === "equal").length;
    return { added, removed, equal };
  }, [diffLines]);

  // Pair adjacent remove+add lines for inline char diff
  const pairedDiffs = useMemo(() => {
    const pairs: Array<{ remove?: DiffLine; add?: DiffLine; charLeft?: CharSpan[]; charRight?: CharSpan[] }> = [];
    let i = 0;
    while (i < diffLines.length) {
      const line = diffLines[i];
      if (line.type === "remove" && i + 1 < diffLines.length && diffLines[i + 1].type === "add") {
        const { left: cl, right: cr } = charDiff(line.text, diffLines[i + 1].text);
        pairs.push({ remove: line, add: diffLines[i + 1], charLeft: cl, charRight: cr });
        i += 2;
      } else {
        pairs.push(line.type === "remove" ? { remove: line } : line.type === "add" ? { add: line } : { remove: undefined, add: undefined });
        if (line.type === "equal") pairs[pairs.length - 1] = { remove: line, add: line };
        i++;
      }
    }
    return pairs;
  }, [diffLines]);

  const clear = () => { setLeft(""); setRight(""); };

  return (
    <ToolPage title="文本对比" description="对比两段文本的差异" icon={<GitCompareArrows className="w-5 h-5" />}>
      <div className="space-y-4">
        {/* Input areas */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <label className="text-[12px] text-muted-foreground">原始文本</label>
          </div>
          <button
            onClick={clear}
            className="px-2.5 py-1 rounded-md text-[12px] cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
          >
            <Eraser className="w-3 h-3" /> 清空
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <textarea
              value={left}
              onChange={(e) => setLeft(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="粘贴或输入原始文本..."
            />
            <CopyButton text={left} />
          </div>
          <div className="relative">
            <textarea
              value={right}
              onChange={(e) => setRight(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-muted/50 text-[14px] font-mono resize-none placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-foreground/65 focus:border-foreground/65"
              placeholder="粘贴或输入修改后的文本..."
            />
            <CopyButton text={right} />
          </div>
        </div>

        {/* Diff result */}
        {hasDiff && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <p className="text-[14px] text-muted-foreground">对比结果</p>
              <div className="flex items-center gap-3 text-[12px]">
                {stats.added > 0 && (
                  <span className="text-green-600 dark:text-green-400">+{stats.added} 行新增</span>
                )}
                {stats.removed > 0 && (
                  <span className="text-red-600 dark:text-red-400">-{stats.removed} 行删除</span>
                )}
                {stats.added === 0 && stats.removed === 0 && (
                  <span className="text-muted-foreground">无差异</span>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] font-mono border-collapse">
                  <tbody>
                    {pairedDiffs.map((pair, idx) => {
                      // Equal line
                      if (pair.remove && pair.add && pair.remove === pair.add) {
                        return (
                          <tr key={idx}>
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border bg-muted/20 text-[12px]">
                              {pair.remove.leftNum}
                            </td>
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border bg-muted/20 text-[12px]">
                              {pair.add.rightNum}
                            </td>
                            <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                              {pair.remove.text || "\u00A0"}
                            </td>
                          </tr>
                        );
                      }
                      // Paired change (remove + add with char diff)
                      if (pair.remove && pair.add && pair.charLeft && pair.charRight) {
                        return (
                          <tr key={idx} className="flex flex-col md:table-row">
                            <td colSpan={3} className="p-0">
                              <div className="flex flex-col">
                                <div className="flex bg-red-500/8">
                                  <span className="w-10 shrink-0 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]">
                                    {pair.remove.leftNum}
                                  </span>
                                  <span className="w-10 shrink-0 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]" />
                                  <span className="px-3 py-0.5 whitespace-pre-wrap break-all flex-1">
                                    <span className="text-red-600 dark:text-red-400 select-none mr-1">-</span>
                                    {pair.charLeft.map((span, si) => (
                                      <span key={si} className={span.highlight ? "bg-red-500/25 rounded-sm" : ""}>
                                        {span.text}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                                <div className="flex bg-green-500/8">
                                  <span className="w-10 shrink-0 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]" />
                                  <span className="w-10 shrink-0 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]">
                                    {pair.add.rightNum}
                                  </span>
                                  <span className="px-3 py-0.5 whitespace-pre-wrap break-all flex-1">
                                    <span className="text-green-600 dark:text-green-400 select-none mr-1">+</span>
                                    {pair.charRight.map((span, si) => (
                                      <span key={si} className={span.highlight ? "bg-green-500/25 rounded-sm" : ""}>
                                        {span.text}
                                      </span>
                                    ))}
                                  </span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      // Solo remove
                      if (pair.remove) {
                        return (
                          <tr key={idx} className="bg-red-500/8">
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]">
                              {pair.remove.leftNum}
                            </td>
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]" />
                            <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                              <span className="text-red-600 dark:text-red-400 select-none mr-1">-</span>
                              {pair.remove.text || "\u00A0"}
                            </td>
                          </tr>
                        );
                      }
                      // Solo add
                      if (pair.add) {
                        return (
                          <tr key={idx} className="bg-green-500/8">
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]" />
                            <td className="w-10 px-2 py-0.5 text-right text-muted-foreground/50 select-none border-r border-border text-[12px]">
                              {pair.add.rightNum}
                            </td>
                            <td className="px-3 py-0.5 whitespace-pre-wrap break-all">
                              <span className="text-green-600 dark:text-green-400 select-none mr-1">+</span>
                              {pair.add.text || "\u00A0"}
                            </td>
                          </tr>
                        );
                      }
                      return null;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  );
}

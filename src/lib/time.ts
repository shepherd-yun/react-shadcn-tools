/** 解析时间戳字符串：13 位及以上按毫秒，否则按秒。无效返回 null */
export function parseTimestamp(raw: string): Date | null {
  const v = raw.trim();
  if (!/^-?\d+$/.test(v)) return null;
  const n = Number(v);
  const ms = v.replace("-", "").length >= 13 ? n : n * 1000;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
}

export function formatLocal(d: Date): string {
  return d.toLocaleString("zh-CN", { hour12: false });
}

/** 把毫秒时长格式化为「1天 2小时 3分 4秒」，忽略符号；不足 1 秒时显示毫秒 */
export function formatDuration(ms: number): string {
  let rest = Math.abs(ms);
  if (rest < 1000) return `${rest}毫秒`;
  const units: [number, string][] = [
    [86400000, "天"],
    [3600000, "小时"],
    [60000, "分"],
    [1000, "秒"],
  ];
  const parts: string[] = [];
  for (const [size, label] of units) {
    const n = Math.floor(rest / size);
    if (n > 0) parts.push(`${n}${label}`);
    rest %= size;
  }
  if (rest > 0) parts.push(`${rest}毫秒`);
  return parts.join(" ");
}

/** 相对现在的描述：「3小时 5分后」/「2天前」 */
export function formatRelative(target: Date, now: number): string {
  const diff = target.getTime() - now;
  if (Math.abs(diff) < 1000) return "刚刚";
  // 相对时间精确到秒即可
  const rounded = Math.round(diff / 1000) * 1000;
  return `${formatDuration(rounded)}${diff > 0 ? "后" : "前"}`;
}

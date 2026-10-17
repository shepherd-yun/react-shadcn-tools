/** A single character of a segment, with optional absolute timestamp (ms). */
export interface CharToken {
  char: string;
  /** Absolute timestamp in ms when this character is spoken, if known. */
  ts?: number;
}

/** Raw segment shape from the uploaded JSON. */
export interface RawSegment {
  startMs: number;
  text: string;
  offsets: Array<{ word: string; ts: number }>;
}

/** Parsed segment with pre-built character tokens for rendering. */
export interface Segment {
  index: number;
  startMs: number;
  /** Absolute end ms — derived from next segment's startMs (or +∞ for last). */
  endMs: number;
  text: string;
  tokens: CharToken[];
  /** True for tag-only segments like "[Music]" / "[Lyric] ...". */
  isTag: boolean;
}

const TAG_RE = /^\s*\[(?:Music|Lyric|Applause|Laughter|Noise)\]/i;

/**
 * Build per-character tokens by greedy-matching `offsets[i].word` against `text`.
 * Characters between matches inherit the previous offset's ts (so punctuation/spacing
 * highlights along with the surrounding word).
 */
function buildTokens(seg: RawSegment): CharToken[] {
  const chars = Array.from(seg.text);
  const tokens: CharToken[] = chars.map((char) => ({ char }));
  let oi = 0;
  let lastTs: number | undefined;
  for (let i = 0; i < tokens.length && oi < seg.offsets.length; i++) {
    if (tokens[i].char === seg.offsets[oi].word) {
      const absTs = seg.startMs + seg.offsets[oi].ts;
      tokens[i].ts = absTs;
      lastTs = absTs;
      oi++;
    } else if (lastTs !== undefined) {
      tokens[i].ts = lastTs;
    }
  }
  // Trailing chars after the last offset inherit lastTs so they highlight together.
  if (lastTs !== undefined) {
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].ts === undefined && i > 0 && tokens[i - 1].ts !== undefined) {
        tokens[i].ts = tokens[i - 1].ts;
      }
    }
  }
  return tokens;
}

/** Validate + normalize raw JSON into Segments. Throws on invalid shape. */
export function parseTranscript(raw: unknown): Segment[] {
  if (!Array.isArray(raw)) throw new Error("JSON 顶层必须是数组");
  const sorted = [...raw]
    .map((item, i) => {
      if (!item || typeof item !== "object") throw new Error(`第 ${i + 1} 项不是对象`);
      const r = item as Record<string, unknown>;
      if (typeof r.startMs !== "number") throw new Error(`第 ${i + 1} 项缺少 startMs`);
      if (typeof r.text !== "string") throw new Error(`第 ${i + 1} 项缺少 text`);
      const offsets = Array.isArray(r.offsets) ? (r.offsets as RawSegment["offsets"]) : [];
      return { startMs: r.startMs, text: r.text, offsets } as RawSegment;
    })
    .sort((a, b) => a.startMs - b.startMs);

  return sorted.map((seg, index) => {
    const next = sorted[index + 1];
    return {
      index,
      startMs: seg.startMs,
      endMs: next ? next.startMs : Number.POSITIVE_INFINITY,
      text: seg.text,
      tokens: buildTokens(seg),
      isTag: TAG_RE.test(seg.text),
    };
  });
}

/** Format ms as mm:ss or h:mm:ss. */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const s = total % 60;
  const m = Math.floor(total / 60) % 60;
  const h = Math.floor(total / 3600);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * Find current segment index for given time.
 * Uses binary search over startMs.
 */
export function findSegmentIndex(segments: Segment[], ms: number): number {
  if (segments.length === 0) return -1;
  if (ms < segments[0].startMs) return -1;
  let lo = 0;
  let hi = segments.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segments[mid].startMs <= ms) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

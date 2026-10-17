import { useEffect, useRef } from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { findSegmentIndex, formatTime, type Segment } from "./types";

interface Props {
  segments: Segment[];
  currentMs: number;
  /** Increments on each user-initiated seek, so we can scroll instantly + unconditionally. */
  seekToken: number;
  onSeek: (ms: number) => void;
  autoFollow: boolean;
  onAutoFollowChange: (v: boolean) => void;
}

export function TranscriptView({
  segments,
  currentMs,
  seekToken,
  onSeek,
  autoFollow,
  onAutoFollowChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<Array<HTMLDivElement | null>>([]);
  /** Set briefly before we trigger a programmatic scroll, so the scroll listener can ignore it. */
  const programmaticScrollUntil = useRef(0);
  const lastSeekToken = useRef(seekToken);

  const activeIndex = findSegmentIndex(segments, currentMs);

  // Auto-follow scroll. On a user-initiated seek (seekToken changed), always position
  // the active segment near the top instantly. On natural advance, only scroll when
  // the active segment is near the bottom or has scrolled out the top — smoothly.
  useEffect(() => {
    if (!autoFollow || activeIndex < 0) return;
    const container = containerRef.current;
    const el = segmentRefs.current[activeIndex];
    if (!container || !el) return;

    const seekJustHappened = lastSeekToken.current !== seekToken;
    lastSeekToken.current = seekToken;
    const offsetTop = el.offsetTop - container.offsetTop;

    if (seekJustHappened) {
      programmaticScrollUntil.current = Date.now() + 200;
      container.scrollTo({ top: Math.max(0, offsetTop - 12), behavior: "auto" });
      return;
    }

    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const nearBottom = eRect.bottom > cRect.bottom - 80;
    const aboveTop = eRect.top < cRect.top;
    if (nearBottom || aboveTop) {
      programmaticScrollUntil.current = Date.now() + 800;
      container.scrollTo({ top: Math.max(0, offsetTop - 12), behavior: "smooth" });
    }
  }, [activeIndex, autoFollow, seekToken]);

  // Detect user scroll → disable auto-follow.
  const onScroll = () => {
    if (Date.now() < programmaticScrollUntil.current) return;
    if (autoFollow) onAutoFollowChange(false);
  };

  const resumeFollow = () => {
    onAutoFollowChange(true);
    const container = containerRef.current;
    const el = segmentRefs.current[activeIndex];
    if (container && el) {
      programmaticScrollUntil.current = Date.now() + 800;
      const offsetTop = el.offsetTop - container.offsetTop;
      container.scrollTo({ top: offsetTop - 12, behavior: "smooth" });
    }
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={containerRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto px-4 md:px-6 py-4 space-y-5"
      >
        {segments.map((seg, i) => (
          <div
            key={seg.index}
            ref={(el) => {
              segmentRefs.current[i] = el;
            }}
          >
            <SegmentBlock
              segment={seg}
              isActive={i === activeIndex}
              currentMs={currentMs}
              onSeek={onSeek}
            />
          </div>
        ))}
        <div className="h-32" />
      </div>

      {!autoFollow && activeIndex >= 0 && (
        <Button
          size="sm"
          variant="secondary"
          onClick={resumeFollow}
          className="absolute right-2 bottom-4 shadow-md cursor-pointer"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          回到当前位置
        </Button>
      )}
    </div>
  );
}

interface SegmentBlockProps {
  segment: Segment;
  isActive: boolean;
  currentMs: number;
  onSeek: (ms: number) => void;
}

function SegmentBlock({ segment, isActive, currentMs, onSeek }: SegmentBlockProps) {
  const hasOffsets = segment.tokens.some((t) => t.ts !== undefined);

  return (
    <div className="group">
      <button
        onClick={() => onSeek(segment.startMs)}
        className={`text-[12px] font-mono mb-1 cursor-pointer transition-colors ${
          isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {formatTime(segment.startMs)}
      </button>
      <p
        className={`text-[15px] leading-[1.9] ${
          segment.isTag ? "text-muted-foreground/60 italic" : ""
        }`}
      >
        {segment.tokens.map((tok, i) => {
          const isPast =
            hasOffsets && tok.ts !== undefined
              ? currentMs >= tok.ts
              : currentMs >= segment.startMs;
          const seekTo = tok.ts ?? segment.startMs;
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(seekTo);
              }}
              className={`cursor-pointer ${
                isPast ? "text-foreground" : "text-muted-foreground/60"
              }`}
            >
              {tok.char}
            </span>
          );
        })}
      </p>
    </div>
  );
}

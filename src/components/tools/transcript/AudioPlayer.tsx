import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTime } from "./types";

function SkipIcon({ dir }: { dir: "back" | "forward" }) {
  const Icon = dir === "back" ? RotateCcw : RotateCw;
  return (
    <span className="relative inline-flex items-center justify-center">
      <Icon className="w-5 h-5" strokeWidth={1.75} />
      <span className="absolute text-[9px] font-semibold leading-none mt-[1px]">5</span>
    </span>
  );
}

export interface AudioPlayerHandle {
  seek: (ms: number) => void;
  togglePlay: () => void;
  skip: (deltaMs: number) => void;
  adjustVolume: (delta: number) => void;
}

interface Props {
  src: string;
  onTimeUpdate: (ms: number) => void;
  /** Called when the user seeks via the progress bar — keeps transcript scroll in sync. */
  onSeek?: (ms: number) => void;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];
const SKIP_MS = 5000;

export const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(function AudioPlayer(
  { src, onTimeUpdate, onSeek },
  ref,
) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [rate, setRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) await a.play();
    else a.pause();
  };

  const skip = (deltaMs: number) => {
    const a = audioRef.current;
    if (!a) return;
    const cap = a.duration || (durationMs || 0) / 1000;
    a.currentTime = Math.max(0, Math.min(cap || a.currentTime, a.currentTime + deltaMs / 1000));
  };

  const adjustVolume = (delta: number) => {
    setMuted(false);
    setVolume((v) => Math.max(0, Math.min(1, v + delta)));
  };

  useImperativeHandle(ref, () => ({
    seek(ms: number) {
      const a = audioRef.current;
      if (!a) return;
      a.currentTime = Math.max(0, ms) / 1000;
      if (a.paused) void a.play().catch(() => {});
    },
    togglePlay() {
      void togglePlay();
    },
    skip(deltaMs: number) {
      skip(deltaMs);
    },
    adjustVolume(delta: number) {
      adjustVolume(delta);
    },
  }));

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted]);

  const onSeekBar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const ms = Number(e.target.value);
    a.currentTime = ms / 1000;
    onSeek?.(ms);
  };

  return (
    <div className="border-t border-border bg-card px-4 md:px-6 py-3">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDurationMs(e.currentTarget.duration * 1000)}
        onTimeUpdate={(e) => {
          const ms = e.currentTarget.currentTime * 1000;
          setCurrentMs(ms);
          onTimeUpdate(ms);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-mono text-muted-foreground tabular-nums shrink-0">
          {formatTime(currentMs)}
        </span>
        <input
          type="range"
          min={0}
          max={durationMs || 0}
          step={100}
          value={Math.min(currentMs, durationMs || 0)}
          onChange={onSeekBar}
          className="flex-1 h-1 accent-primary cursor-pointer"
        />
        <span className="text-[12px] font-mono text-muted-foreground tabular-nums shrink-0">
          {formatTime(durationMs)}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-1 mt-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-SKIP_MS)}
          className="cursor-pointer"
          title="后退 5 秒（←）"
        >
          <SkipIcon dir="back" />
        </Button>
        <Button
          variant="default"
          size="icon"
          onClick={togglePlay}
          className="cursor-pointer rounded-full"
          title={playing ? "暂停（空格）" : "播放（空格）"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(SKIP_MS)}
          className="cursor-pointer"
          title="前进 5 秒（→）"
        >
          <SkipIcon dir="forward" />
        </Button>

        <div className="ml-2 flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMuted((m) => !m)}
            className="cursor-pointer"
            title={muted ? "取消静音" : "静音"}
          >
            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value));
              if (Number(e.target.value) > 0 && muted) setMuted(false);
            }}
            className="w-20 h-1 accent-primary cursor-pointer"
          />
        </div>

        <div className="ml-auto">
          <RateSelector rate={rate} onChange={setRate} />
        </div>
      </div>
    </div>
  );
});

function RateSelector({ rate, onChange }: { rate: number; onChange: (r: number) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer font-mono tabular-nums w-14"
      >
        {rate}x
      </Button>
      {open && (
        <div className="absolute right-0 bottom-full mb-1 rounded-lg border border-border bg-popover shadow-md py-1 min-w-20 z-10">
          {RATES.map((r) => (
            <button
              key={r}
              onClick={() => {
                onChange(r);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-1.5 text-[13px] font-mono cursor-pointer hover:bg-muted ${
                r === rate ? "text-primary" : ""
              }`}
            >
              {r}x
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

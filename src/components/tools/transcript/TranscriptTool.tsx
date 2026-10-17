import { useEffect, useRef, useState } from "react";
import { AudioLines, RotateCcw } from "lucide-react";
import { ToolPage } from "@/components/ToolPage";
import { Button } from "@/components/ui/button";
import { UploadPanel, type LoadedData } from "./UploadPanel";
import { TranscriptView } from "./TranscriptView";
import { AudioPlayer, type AudioPlayerHandle } from "./AudioPlayer";

export default function TranscriptTool() {
  const [data, setData] = useState<LoadedData | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [autoFollow, setAutoFollow] = useState(true);
  const [seekToken, setSeekToken] = useState(0);
  const playerRef = useRef<AudioPlayerHandle>(null);

  // Revoke object URL when data changes / unmounts.
  useEffect(() => {
    if (!data) return;
    return () => URL.revokeObjectURL(data.audioUrl);
  }, [data]);

  // Sync transcript scroll/highlight to a position the audio just jumped to.
  // Optimistically pushes currentMs (so the highlight updates without waiting for
  // the next timeupdate event) and bumps seekToken (so the transcript scrolls to
  // it instantly instead of smoothly).
  const syncToTime = (ms: number) => {
    setCurrentMs(ms);
    setSeekToken((t) => t + 1);
    setAutoFollow(true);
  };

  // Click on text → seek + auto-play.
  const handleTextSeek = (ms: number) => {
    playerRef.current?.seek(ms);
    syncToTime(ms);
  };

  // Keyboard shortcuts: space toggles play, ←/→ skip ±5s, ↑/↓ adjust volume.
  useEffect(() => {
    if (!data) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }
      const player = playerRef.current;
      if (!player) return;
      switch (e.code) {
        case "Space":
          e.preventDefault();
          player.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          player.skip(-5000);
          break;
        case "ArrowRight":
          e.preventDefault();
          player.skip(5000);
          break;
        case "ArrowUp":
          e.preventDefault();
          player.adjustVolume(0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          player.adjustVolume(-0.05);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data]);

  const reset = () => {
    setData(null);
    setCurrentMs(0);
    setAutoFollow(true);
    setSeekToken(0);
  };

  return (
    <ToolPage
      title="音频文字同步"
      description="上传 JSON 字幕与音频，逐字同步播放"
      icon={<AudioLines className="w-5 h-5" />}
    >
      {!data ? (
        <UploadPanel onLoad={setData} />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col h-[calc(100vh-180px)] min-h-[480px]">
          <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-border">
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium truncate">{data.audioName}</div>
              <div className="text-[12px] text-muted-foreground truncate">
                字幕：{data.jsonName} · 共 {data.segments.length} 段
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} className="cursor-pointer">
              <RotateCcw className="w-3.5 h-3.5" />
              重新上传
            </Button>
          </div>

          <TranscriptView
            segments={data.segments}
            currentMs={currentMs}
            seekToken={seekToken}
            onSeek={handleTextSeek}
            autoFollow={autoFollow}
            onAutoFollowChange={setAutoFollow}
          />

          <AudioPlayer
            ref={playerRef}
            src={data.audioUrl}
            onTimeUpdate={setCurrentMs}
            onSeek={syncToTime}
          />
        </div>
      )}
    </ToolPage>
  );
}

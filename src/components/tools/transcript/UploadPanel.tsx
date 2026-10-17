import { useRef, useState } from "react";
import { FileJson, FileAudio, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { parseTranscript, type Segment } from "./types";

export interface LoadedData {
  segments: Segment[];
  audioUrl: string;
  audioName: string;
  jsonName: string;
}

interface Props {
  onLoad: (data: LoadedData) => void;
}

const AUDIO_EXTS = /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i;

function isAudio(file: File) {
  return file.type.startsWith("audio/") || AUDIO_EXTS.test(file.name);
}

export function UploadPanel({ onLoad }: Props) {
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const acceptFiles = (files: FileList | File[]) => {
    let nextJson = jsonFile;
    let nextAudio = audioFile;
    for (const f of Array.from(files)) {
      if (isAudio(f)) nextAudio = f;
      else nextJson = f; // anything non-audio is treated as the subtitle file
    }
    setJsonFile(nextJson);
    setAudioFile(nextAudio);
  };

  const handleStart = async () => {
    if (!jsonFile || !audioFile) return;
    try {
      const text = await jsonFile.text();
      const segments = parseTranscript(JSON.parse(text));
      if (segments.length === 0) {
        toast.error("JSON 中没有有效的字幕段落");
        return;
      }
      const audioUrl = URL.createObjectURL(audioFile);
      onLoad({ segments, audioUrl, audioName: audioFile.name, jsonName: jsonFile.name });
    } catch (e) {
      toast.error(`JSON 解析失败：${(e as Error).message}`);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) acceptFiles(e.dataTransfer.files);
      }}
      className={`rounded-2xl border-2 border-dashed p-8 md:p-12 transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/20"
      }`}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h2 className="!text-[16px] font-medium">上传字幕 JSON 与音频文件</h2>
          <p className="text-[13px] text-muted-foreground mt-1">
            可拖拽到此区域，或点击下方按钮选择
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 w-full max-w-xl mt-2">
          <FilePicker
            icon={<FileJson className="w-4 h-4" />}
            label="字幕文件（JSON / TXT）"
            file={jsonFile}
            inputRef={jsonInputRef}
            accept=".json,.txt,application/json,text/plain"
            onPick={(f) => setJsonFile(f)}
          />
          <FilePicker
            icon={<FileAudio className="w-4 h-4" />}
            label="音频文件"
            file={audioFile}
            inputRef={audioInputRef}
            accept="audio/*"
            onPick={(f) => setAudioFile(f)}
          />
        </div>

        <Button
          size="lg"
          onClick={handleStart}
          disabled={!jsonFile || !audioFile}
          className="mt-2 cursor-pointer disabled:cursor-not-allowed"
        >
          开始播放
        </Button>
      </div>
    </div>
  );
}

interface FilePickerProps {
  icon: React.ReactNode;
  label: string;
  file: File | null;
  accept: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (file: File) => void;
}

function FilePicker({ icon, label, file, accept, inputRef, onPick }: FilePickerProps) {
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/50 cursor-pointer transition-colors text-left"
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[12px] text-muted-foreground truncate">
          {file ? file.name : "未选择"}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}

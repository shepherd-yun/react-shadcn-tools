import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { CalendarDays, ChevronLeft, ChevronRight, ImagePlus, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { DiaryShell, RoundButton } from "./DiaryShell";
import { getEntry, MAX_PHOTO_BYTES, MAX_PHOTOS, saveEntry, uploadPhoto, type DiaryPhoto } from "./api";
import {
  addDays,
  isValidDate,
  lunarFull,
  lunarText,
  monthStr,
  parts,
  solarText,
  timeText,
  todayStr,
  weekday,
  yearsAgo,
} from "./dates";
import { useOnThisDay, type PastRow } from "./useOnThisDay";

export default function DiaryToday() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get("date");
  const today = todayStr();
  const date = isValidDate(raw) ? raw : today;
  const { y, m, d } = parts(date);
  const go = (next: string) => navigate(next === today ? "/diary" : `/diary?date=${next}`);

  return (
    <DiaryShell>
      <header className="flex items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <div className="diary-serif text-[64px] leading-[0.9] font-bold text-[var(--d-red)] md:text-[76px]">{d}</div>
          <div className="flex flex-col gap-0.5 pb-1">
            <div className="text-[14px] font-medium whitespace-nowrap">
              {y}年{m}月 · {weekday(date)}
            </div>
            <div className="text-[13px] text-[var(--d-muted)]">{lunarFull(date)}</div>
            {date !== today && (
              <Link to="/diary" className="text-[13px] font-medium text-[var(--d-red)]">
                回到今天
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <RoundButton label="前一天" className="max-sm:hidden" onClick={() => go(addDays(date, -1))}>
            <ChevronLeft className="size-5" />
          </RoundButton>
          <RoundButton label="后一天" className="max-sm:hidden" onClick={() => go(addDays(date, 1))}>
            <ChevronRight className="size-5" />
          </RoundButton>
          <RoundButton label="打开日历" onClick={() => navigate(`/diary/calendar?month=${monthStr(date)}`)}>
            <CalendarDays className="size-5" />
          </RoundButton>
        </div>
      </header>

      <DayEditor key={date} date={date} title={date === today ? "今天的日记" : `${solarText(date)}的日记`} />
      <OnThisDayPreview date={date} />
    </DiaryShell>
  );
}

/* ---------- 编辑：自动保存，失败不丢字 ---------- */

interface Draft {
  content: string;
  photos: DiaryPhoto[];
  at: number;
}

const SAVE_DELAY = 1500;

function readDraft(key: string): Draft | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, draft: Draft | null) {
  try {
    if (draft) localStorage.setItem(key, JSON.stringify(draft));
    else localStorage.removeItem(key);
  } catch {
    // 存不了草稿也不影响保存
  }
}

function stamped(value: { content: string; photos: DiaryPhoto[] }): Draft {
  return { ...value, at: Date.now() };
}

const sameKeys = (a: DiaryPhoto[], b: DiaryPhoto[]) =>
  a.length === b.length && a.every((p, i) => p.key === b[i].key);

function DayEditor({ date, title }: { date: string; title: string }) {
  const draftKey = `diary-draft:${date}`;
  const [loadState, setLoadState] = useState<"loading" | "ready" | "failed">("loading");
  const [content, setContent] = useState("");
  const [photos, setPhotos] = useState<DiaryPhoto[]>([]);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const [uploading, setUploading] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  // 保存用最新值，不等 React 重渲染
  const latest = useRef<{ content: string; photos: DiaryPhoto[] }>({ content: "", photos: [] });
  const dirty = useRef(false);
  const inflight = useRef(false);
  const again = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchEntry = useCallback(() => {
    getEntry(date)
      .then((entry) => {
        const c = entry?.content ?? "";
        const p = entry?.photos ?? [];
        latest.current = { content: c, photos: p };
        setContent(c);
        setPhotos(p);
        setSavedAt(entry?.updatedAt ?? null);
        const local = readDraft(draftKey);
        const newer = local && (!entry || local.at > Date.parse(entry.updatedAt));
        if (local && newer && (local.content !== c || !sameKeys(local.photos, p))) setDraft(local);
        else writeDraft(draftKey, null);
        setLoadState("ready");
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "加载日记失败");
        setLoadState("failed");
      });
  }, [date, draftKey]);

  useEffect(fetchEntry, [fetchEntry]);

  const retryLoad = () => {
    setLoadState("loading");
    fetchEntry();
  };

  // 保存过程中又有改动时，完成后用它再存一次（不在 save 里直接递归调用自己）
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const save = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    if (inflight.current) {
      again.current = true;
      return;
    }
    inflight.current = true;
    dirty.current = false;
    setSaveState("saving");
    const snapshot = latest.current;
    try {
      const saved = await saveEntry(date, snapshot.content, snapshot.photos.map((p) => p.key));
      setSavedAt(saved?.updatedAt ?? new Date().toISOString());
      setSaveState("idle");
      if (!dirty.current) {
        writeDraft(draftKey, null);
        // 换成服务器签过名的地址，本地预览地址可以释放了
        if (saved && sameKeys(saved.photos, latest.current.photos)) {
          latest.current.photos.forEach((p) => p.url.startsWith("blob:") && URL.revokeObjectURL(p.url));
          latest.current = { ...latest.current, photos: saved.photos };
          setPhotos(saved.photos);
        }
      }
    } catch {
      dirty.current = true;
      setSaveState("error");
    } finally {
      inflight.current = false;
      if (again.current) {
        again.current = false;
        void saveRef.current();
      }
    }
  }, [date, draftKey]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // 离开这一天（换日期、换页面）、切走标签页时立刻保存
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void saveRef.current();
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current || inflight.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      void saveRef.current();
    };
  }, []);

  const changed = (next: { content?: string; photos?: DiaryPhoto[] }, delay = SAVE_DELAY) => {
    latest.current = { ...latest.current, ...next };
    dirty.current = true;
    writeDraft(draftKey, stamped(latest.current));
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void save(), delay);
  };

  const onText = (value: string) => {
    setContent(value);
    changed({ content: value });
  };

  const setAndSavePhotos = (next: DiaryPhoto[]) => {
    setPhotos(next);
    changed({ photos: next }, 0);
  };

  const addFiles = async (files: FileList | null) => {
    if (!files) return;
    let room = MAX_PHOTOS - latest.current.photos.length - uploading;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} 不是图片，已跳过`);
        continue;
      }
      if (file.size > MAX_PHOTO_BYTES) {
        toast.error(`${file.name} 超过 20 MB，已跳过`);
        continue;
      }
      if (room <= 0) {
        toast.error(`每篇最多 ${MAX_PHOTOS} 张照片`);
        break;
      }
      room--;
      setUploading((n) => n + 1);
      uploadPhoto(file)
        .then((key) => setAndSavePhotos([...latest.current.photos, { key, url: URL.createObjectURL(file) }]))
        .catch((err) => toast.error(err instanceof Error ? err.message : "照片上传失败"))
        .finally(() => setUploading((n) => n - 1));
    }
  };

  const removePhoto = (key: string) => setAndSavePhotos(latest.current.photos.filter((p) => p.key !== key));

  const restoreDraft = () => {
    if (!draft) return;
    setContent(draft.content);
    setPhotos(draft.photos);
    setDraft(null);
    changed({ content: draft.content, photos: draft.photos }, 0);
  };

  const discardDraft = () => {
    writeDraft(draftKey, null);
    setDraft(null);
  };

  // 输入框随内容长高
  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [content, loadState]);

  const status =
    loadState === "loading" ? (
      "加载中…"
    ) : saveState === "saving" ? (
      "保存中…"
    ) : saveState === "error" ? (
      <button type="button" onClick={() => void save()} className="cursor-pointer font-medium text-[var(--d-red)]">
        保存失败，点此重试
      </button>
    ) : savedAt ? (
      `已保存 ${timeText(savedAt)}`
    ) : (
      ""
    );

  return (
    <section className="flex flex-col gap-3 rounded border border-[var(--d-line)] bg-[var(--d-card)] px-4 pt-4 pb-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold tracking-[0.08em]">{title}</h2>
        <div className="text-[12px] text-[var(--d-muted)]" aria-live="polite">
          {status}
        </div>
      </div>

      {draft && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm bg-[var(--d-bg)] px-3 py-2 text-[13px]">
          <span className="text-[var(--d-muted)]">这一天有一份没保存上的内容（{timeText(new Date(draft.at).toISOString())}）</span>
          <button type="button" onClick={restoreDraft} className="cursor-pointer font-medium text-[var(--d-red)]">
            恢复
          </button>
          <button type="button" onClick={discardDraft} className="cursor-pointer text-[var(--d-muted)]">
            丢弃
          </button>
        </div>
      )}

      {loadState === "failed" ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-[14px] text-[var(--d-muted)]">
          没加载出来
          <button type="button" onClick={retryLoad} className="cursor-pointer font-medium text-[var(--d-red)]">
            重试
          </button>
        </div>
      ) : (
        <textarea
          ref={textRef}
          value={content}
          disabled={loadState !== "ready"}
          onChange={(e) => onText(e.target.value)}
          onBlur={() => void save()}
          placeholder={loadState === "ready" ? "今天发生了什么？" : ""}
          aria-label="日记正文"
          rows={6}
          className="min-h-40 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-[1.75] outline-none placeholder:text-[var(--d-faint)] focus-visible:outline-none"
        />
      )}

      {(photos.length > 0 || uploading > 0) && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <div key={p.key} className="group relative size-[84px] md:size-24">
              <button
                type="button"
                onClick={() => setViewing(p.url)}
                className="diary-photo-placeholder size-full cursor-zoom-in overflow-hidden rounded-sm"
              >
                <img src={p.url} alt="日记照片" className="size-full object-cover" />
              </button>
              <button
                type="button"
                aria-label="删除这张照片"
                onClick={() => removePhoto(p.key)}
                className="absolute -top-2 -right-2 flex size-6 cursor-pointer items-center justify-center rounded-full bg-[var(--d-ink)] text-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          {Array.from({ length: uploading }, (_, i) => (
            <div
              key={`up-${i}`}
              className="diary-photo-placeholder flex size-[84px] items-center justify-center rounded-sm text-[12px] text-[var(--d-muted)] md:size-24"
            >
              上传中…
            </div>
          ))}
          {photos.length + uploading < MAX_PHOTOS && loadState === "ready" && (
            <button
              type="button"
              aria-label="添加照片"
              onClick={() => fileRef.current?.click()}
              className="flex size-[84px] cursor-pointer items-center justify-center rounded-sm border border-dashed border-[var(--d-faint)] text-[var(--d-muted)] md:size-24"
            >
              <Plus className="size-6" />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-[var(--d-line-soft)] pt-1">
        <button
          type="button"
          aria-label="插入图片"
          title="插入图片"
          disabled={loadState !== "ready" || photos.length + uploading >= MAX_PHOTOS}
          onClick={() => fileRef.current?.click()}
          className="flex size-11 cursor-pointer items-center justify-center disabled:cursor-default disabled:opacity-40"
        >
          <ImagePlus className="size-[22px]" strokeWidth={1.6} />
        </button>
        <button
          type="button"
          disabled={loadState !== "ready"}
          onClick={() => {
            const el = textRef.current;
            if (!el) return;
            el.focus();
            el.setSelectionRange(el.value.length, el.value.length);
          }}
          className="h-11 cursor-pointer rounded-sm bg-[var(--d-red)] px-[18px] text-[14px] font-medium text-white disabled:opacity-60"
        >
          {content ? "继续写" : "开始写"}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          void addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {viewing && <Lightbox url={viewing} onClose={() => setViewing(null)} />}
    </section>
  );
}

export function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-label="查看照片"
      onClick={onClose}
      className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-4"
    >
      <img src={url} alt="日记照片" className="max-h-full max-w-full object-contain" />
    </div>
  );
}

/* ---------- 那年今日预览 ---------- */

const PREVIEW_PER_MODE = 3;

function OnThisDayPreview({ date }: { date: string }) {
  const { loading, firstDate, solar, lunar } = useOnThisDay(date);
  const solarHits = solar.filter((r) => r.entry);
  const lunarHits = lunar.filter((r) => r.entry && !solarHits.some((s) => s.date === r.date));
  const rows: { row: PastRow; mode: "solar" | "lunar" }[] = [
    ...solarHits.slice(0, PREVIEW_PER_MODE).map((row) => ({ row, mode: "solar" as const })),
    ...lunarHits.slice(0, PREVIEW_PER_MODE).map((row) => ({ row, mode: "lunar" as const })),
  ];
  const base = `/diary/on-this-day?date=${date}`;

  return (
    <section className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <h2 className="diary-serif text-[20px] font-bold">那年今日</h2>
        {!loading && firstDate && (
          <Link to={base} className="flex min-h-11 items-center gap-0.5 text-[13px] font-medium text-[var(--d-red)]">
            阳历 {solar.filter((r) => r.entry).length} 年 · 农历 {lunar.filter((r) => r.entry).length} 年
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="flex flex-col border-t-2 border-[var(--d-ink)]">
        {loading ? (
          <p className="py-4 text-[13px] text-[var(--d-muted)]">加载中…</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-[13px] leading-relaxed text-[var(--d-muted)]">
            {firstDate ? "往年的这一天还没有日记。" : "坚持写下去，明年的这一天就能在这里看到今天。"}
          </p>
        ) : (
          rows.map(({ row, mode }) => (
            <Link
              key={`${mode}-${row.date}`}
              to={`${base}&mode=${mode}`}
              className="flex gap-3.5 border-b border-[var(--d-line)] py-3 hover:bg-[var(--d-line-soft)]/40"
            >
              <div className="diary-serif w-[58px] flex-none text-[22px] leading-[1.2] font-bold text-[var(--d-red)]">
                {parts(row.date).y}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="text-[12px] text-[var(--d-muted)]">
                  {mode === "solar"
                    ? `阳历 ${solarText(row.date)} · ${yearsAgo(row.ago)}${photoText(row)}`
                    : `农历${lunarText(row.date)} · ${parts(row.date).y}年${solarText(row.date)}${photoText(row)}`}
                </div>
                <div className="line-clamp-2 text-[14px] leading-[1.6]">{row.entry?.content || "（只有照片）"}</div>
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

function photoText(row: PastRow) {
  const n = row.entry?.photos.length ?? 0;
  return n > 0 ? ` · ${n} 张照片` : "";
}

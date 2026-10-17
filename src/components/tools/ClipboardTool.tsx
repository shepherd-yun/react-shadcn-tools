import { useState, useEffect, useRef } from "react";
import { ToolPage } from "../ToolPage";
import { Clipboard, Upload, Download, Trash2, FileText, Image, File, Pencil, X, Check, Copy } from "lucide-react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import { toast } from "sonner";
import { copyToClipboard } from "../copyUtil";

interface ClipboardItem {
  id: string;
  type: "TEXT" | "IMAGE" | "FILE";
  content: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  createdAt: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getTypeIcon(type: string) {
  switch (type) {
    case "IMAGE":
      return <Image className="h-4 w-4" />;
    case "FILE":
      return <File className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

/* ---------- Inline Login ---------- */
function InlineLogin() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("请输入用户名和密码");
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success("登录成功");
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-16">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <p className="text-center text-[14px] text-muted-foreground mb-6">
          登录后即可使用网络粘贴板
        </p>
        <input
          type="text"
          placeholder="用户名"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background"
        />
        <input
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full cursor-pointer rounded-xl bg-primary py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </div>
  );
}

/* ---------- Editable Item ---------- */
function EditableItem({
  item,
  onDelete,
  onClick,
  onUpdate,
}: {
  item: ClipboardItem;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (item: ClipboardItem) => void;
  onUpdate: (id: string, content: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOriginalContent(item.content || "");
    setEditContent(item.content || "");
    setEditing(true);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing(false);
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editContent.trim()) {
      toast.error("内容不能为空");
      return;
    }
    setSaving(true);
    try {
      await onUpdate(item.id, editContent);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div
        className="rounded-xl border border-primary/30 p-4 bg-primary/[0.02]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
            {getTypeIcon(item.type)}
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            {originalContent !== editContent && (
              <div className="rounded-lg bg-muted/50 px-3 py-2">
                <p className="text-[12px] text-muted-foreground mb-1">编辑前</p>
                <p className="whitespace-pre-wrap break-all text-[13px] text-muted-foreground leading-relaxed">
                  {originalContent}
                </p>
              </div>
            )}
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40"
            />
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={cancelEdit}
                className="flex cursor-pointer items-center gap-1 rounded-md px-3 py-1.5 text-[12px] text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="h-3 w-3" /> 取消
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex cursor-pointer items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-[12px] text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                <Check className="h-3 w-3" /> {saving ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === "TEXT") {
      copyToClipboard(item.content || "");
      toast.success("已复制到剪贴板");
    }
  };

  return (
    <div
      onClick={() => { if (item.type !== "TEXT") onClick(item); }}
      className={`group rounded-xl border border-border p-4 transition-colors hover:border-primary/20 hover:bg-primary/[0.02] ${item.type !== "TEXT" ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
          {getTypeIcon(item.type)}
        </div>
        <div className="min-w-0 flex-1">
          {item.type === "TEXT" ? (
            <p className="whitespace-pre-wrap break-all text-[14px] leading-relaxed">
              {item.content}
            </p>
          ) : item.type === "IMAGE" ? (
            <div>
              <img
                src={item.content || ""}
                alt={item.fileName || ""}
                className="max-h-48 max-w-full rounded-lg object-cover"
              />
              <p className="mt-1 text-[13px] text-muted-foreground">{item.fileName}</p>
            </div>
          ) : (
            <div>
              <p className="text-[14px]">{item.fileName}</p>
              {item.fileSize && (
                <p className="text-[13px] text-muted-foreground">
                  {formatSize(item.fileSize)}
                </p>
              )}
            </div>
          )}
          <p className="mt-1 text-[12px] text-muted-foreground/60">
            {formatTime(item.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100">
          {(item.type === "FILE" || item.type === "IMAGE") && (
            <span className="rounded-md p-1.5 text-muted-foreground">
              <Download className="h-4 w-4" />
            </span>
          )}
          {item.type === "TEXT" && (
            <button
              onClick={handleCopy}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              title="复制"
            >
              <Copy className="h-4 w-4" />
            </button>
          )}
          {item.type === "TEXT" && (
            <button
              onClick={startEdit}
              className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              title="编辑"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => onDelete(item.id, e)}
            className="cursor-pointer rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="删除"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Main ---------- */
export default function ClipboardTool() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) fetchItems();
  }, [isAuthenticated]);

  const fetchItems = async () => {
    try {
      const data = await api.get<unknown, ClipboardItem[]>("/clipboard");
      setItems(data || []);
    } catch {
      toast.error("获取粘贴板内容失败");
    }
  };

  const saveText = async () => {
    if (!text.trim()) {
      toast.error("请输入文字内容");
      return;
    }
    setLoading(true);
    try {
      await api.post("/clipboard", { type: "TEXT", content: text });
      setText("");
      toast.success("已保存");
      fetchItems();
    } catch {
      toast.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: globalThis.File) => {
    setUploading(true);
    try {
      const { url: presignedUrl, key } = await api.get<
        unknown,
        { url: string; key: string }
      >("/upload/presign", { params: { fileName: file.name } });

      await fetch(presignedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": "application/octet-stream" },
      });

      const isImage = file.type.startsWith("image/");
      await api.post("/clipboard", {
        type: isImage ? "IMAGE" : "FILE",
        content: key,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      });

      toast.success("上传成功");
      fetchItems();
    } catch (err: any) {
      toast.error(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const deleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.delete(`/clipboard/${id}`);
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("已删除");
    } catch {
      toast.error("删除失败");
    }
  };

  const updateItem = async (id: string, content: string) => {
    try {
      await api.patch(`/clipboard/${id}`, { content });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, content } : i))
      );
      toast.success("已保存");
    } catch {
      toast.error("保存失败");
    }
  };

  const handleItemClick = async (item: ClipboardItem) => {
    if (item.type === "TEXT") {
      copyToClipboard(item.content || "");
      toast.success("已复制到剪贴板");
    } else if (item.content) {
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = item.content;
      document.body.appendChild(iframe);
      setTimeout(() => document.body.removeChild(iframe), 10000);
    }
  };

  return (
    <ToolPage
      title="网络粘贴板"
      description="个人云端粘贴板，支持文字、图片、文件"
      icon={<Clipboard className="h-5 w-5" />}
    >
      {!isAuthenticated ? (
        <InlineLogin />
      ) : (
        <>
          {/* Input area */}
          <div className="space-y-3">
            <textarea
              placeholder="输入要保存的文字..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-3 text-[14px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background"
            />
            <div className="flex gap-3">
              <button
                onClick={saveText}
                disabled={loading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-[14px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Clipboard className="h-4 w-4" />
                {loading ? "保存中..." : "保存文字"}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-[14px] font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "上传中..." : "上传文件"}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>
          </div>

          {/* Items list */}
          <div className="space-y-3">
            <p className="text-[14px] text-muted-foreground">我的内容 ({items.length})</p>
            {items.length === 0 && (
              <p className="py-8 text-center text-[14px] text-muted-foreground/50">
                暂无内容，开始添加吧
              </p>
            )}
            {items.map((item) => (
              <EditableItem
                key={item.id}
                item={item}
                onDelete={deleteItem}
                onClick={handleItemClick}
                onUpdate={updateItem}
              />
            ))}
          </div>
        </>
      )}
    </ToolPage>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

/** 需要站长登录的工具在未登录时显示的密码框 */
export function InlineLogin({ hint }: { hint: string }) {
  const { login } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error("请输入站长密码");
      return;
    }
    setLoading(true);
    try {
      await login(password);
      toast.success("登录成功");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center py-16">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <p className="text-center text-[14px] text-muted-foreground mb-6">{hint}</p>
        <input
          type="password"
          placeholder="站长密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
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

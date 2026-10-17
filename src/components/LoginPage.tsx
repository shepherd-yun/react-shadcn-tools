import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/lib/auth";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  if (isAuthenticated) {
    navigate(redirect, { replace: true });
    return null;
  }

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
      navigate(redirect, { replace: true });
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="!text-xl tracking-tight">DevTools</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background"
          />
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:bg-background"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-xl bg-primary py-3 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

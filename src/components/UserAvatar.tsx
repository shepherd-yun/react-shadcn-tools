import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "react-router";
import { LogIn, LogOut, User } from "lucide-react";

export function UserAvatar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate("/login")}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <LogIn className="h-4 w-4" />
        登录
      </button>
    );
  }

  const initial = (user?.name || user?.username || "U").charAt(0).toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-primary text-[13px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
      >
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card py-1 shadow-lg z-50">
          <div className="border-b border-border px-4 py-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-[12px] font-medium text-primary-foreground">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium truncate">{user?.name}</p>
              <p className="text-[12px] text-muted-foreground truncate">@{user?.username}</p>
            </div>
          </div>
          <div className="py-1">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/login");
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <User className="h-4 w-4" />
              个人信息
            </button>
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-[13px] text-destructive transition-colors hover:bg-destructive/5"
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

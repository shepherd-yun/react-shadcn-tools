import type { ReactNode } from "react";
import { NavLink } from "react-router";
import { useAuth } from "@/lib/auth";
import { InlineLogin } from "../../InlineLogin";
import "./diary.css";

const tabs = [
  { to: "/diary", label: "日记" },
  { to: "/diary/on-this-day", label: "那年今日" },
  { to: "/diary/calendar", label: "日历" },
];

/** 三屏共用：登录检查、顶部切换、设计稿的纸色底 */
export function DiaryShell({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <InlineLogin hint="登录后即可使用日记" />;

  return (
    <div className="diary -mx-4 -mb-4 min-h-[calc(100vh-56px)] px-5 pt-4 pb-10 md:mx-auto md:mb-0 md:max-w-[720px] md:rounded md:border md:border-[var(--d-line)] md:px-8 md:pt-6">
      <nav aria-label="日记" className="mb-6 flex border-b border-[var(--d-line)]">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              `-mb-px flex min-h-11 items-center border-b-2 px-3 text-[14px] ${
                isActive
                  ? "border-[var(--d-red)] font-bold text-[var(--d-red)]"
                  : "border-transparent text-[var(--d-muted)] hover:text-[var(--d-ink)]"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export function RoundButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--d-line)] bg-[var(--d-card)] text-[var(--d-ink)] hover:border-[var(--d-ink)] ${className}`}
    >
      {children}
    </button>
  );
}

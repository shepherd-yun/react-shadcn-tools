import { Outlet, NavLink, Link } from "react-router";
import {
  Clock, FileCode, Braces, Link as LinkIcon, Hash, KeyRound, CaseSensitive, Calendar, Globe, Menu, Wrench, QrCode, Clipboard, GitCompareArrows, AudioLines,
} from "lucide-react";
import { useState } from "react";
import { UserAvatar } from "./UserAvatar";

const navItems = [
  { to: "/", icon: CaseSensitive, label: "命名转换", end: true },
  { to: "/clipboard", icon: Clipboard, label: "网络粘贴板" },
  { to: "/timestamp", icon: Clock, label: "时间戳转换" },
  { to: "/url", icon: LinkIcon, label: "URL 编解码" },
  { to: "/qrcode", icon: QrCode, label: "二维码生成" },
  { to: "/number-base", icon: Hash, label: "进制转换" },
  { to: "/base64", icon: FileCode, label: "Base64" },
  { to: "/jwt", icon: KeyRound, label: "JWT 解析" },
  { to: "/json", icon: Braces, label: "JSON 格式化" },
  { to: "/calendar", icon: Calendar, label: "日历" },
  { to: "/diff", icon: GitCompareArrows, label: "文本对比" },
  { to: "/transcript", icon: AudioLines, label: "音频文字同步" },
  { to: "/bookmarks", icon: Globe, label: "常用网址" },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static z-50 h-full w-[180px] shrink-0 bg-card border-r border-border
          flex flex-col transition-transform duration-200
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <Link to="/" className="px-4 py-5 flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Wrench className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-[16px] tracking-tight font-semibold">DevTools</span>
        </Link>

        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-[14px] transition-all duration-150
                ${isActive
                  ? "bg-primary/[0.06] text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center px-4 py-3 md:px-5">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-md hover:bg-muted cursor-pointer md:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="ml-3 text-[15px] md:hidden">DevTools</span>
          <div className="ml-auto">
            <UserAvatar />
          </div>
        </div>
        <div className="px-4 pb-4 md:px-5 md:pb-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

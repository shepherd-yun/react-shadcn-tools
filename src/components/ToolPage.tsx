import type { ReactNode } from "react";

interface ToolPageProps {
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}

export function ToolPage({ title, description, icon, children }: ToolPageProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <h1 className="!text-[18px] md:!text-[22px]">{title}</h1>
          <p className="text-muted-foreground text-[13px] md:text-[14px]">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

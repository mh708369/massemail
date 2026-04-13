"use client";

import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "./theme-toggle";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="px-8 h-[60px] flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {subtitle && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <p className="text-[13px] text-muted-foreground truncate">{subtitle}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {actions && <div className="flex items-center gap-1.5 mr-2">{actions}</div>}
          <ThemeToggle />
          <NotificationsBell />
        </div>
      </div>
    </header>
  );
}

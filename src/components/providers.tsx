"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPalette } from "@/components/layout/command-palette";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        <TooltipProvider>
          {children}
          <CommandPalette />
        </TooltipProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}

import { cn } from "@/lib/utils";
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon | string;
  trend?: { value: number; positive?: boolean };
  variant?: "default" | "success" | "warning" | "danger" | "brand";
  className?: string;
}

const variantStyles = {
  default: {
    iconBg: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
    valueColor: "text-foreground",
  },
  success: {
    iconBg: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    valueColor: "text-foreground",
  },
  warning: {
    iconBg: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
    valueColor: "text-foreground",
  },
  danger: {
    iconBg: "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20",
    valueColor: "text-foreground",
  },
  brand: {
    iconBg: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
    valueColor: "text-foreground",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon,
  trend,
  variant = "default",
  className,
}: StatCardProps) {
  const styles = variantStyles[variant];
  const isEmoji = typeof icon === "string";
  const IconComp = !isEmoji ? (icon as LucideIcon | undefined) : undefined;

  return (
    <div
      className={cn(
        "group relative bg-card rounded-xl p-5 border border-border/60 shadow-xs hover:shadow-md hover:border-border transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        {icon && (
          <div
            className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center transition-all group-hover:scale-105",
              styles.iconBg
            )}
          >
            {IconComp ? (
              <IconComp className="w-[18px] h-[18px]" strokeWidth={2} />
            ) : (
              <span className="text-lg">{icon as string}</span>
            )}
          </div>
        )}
        {trend && (
          <div
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
              trend.positive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400"
            )}
          >
            {trend.positive ? (
              <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
            ) : (
              <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />
            )}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <p className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase mb-1">
        {title}
      </p>
      <p className={cn("text-2xl font-bold tracking-tight nums-tabular", styles.valueColor)}>
        {value}
      </p>
      {description && (
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight line-clamp-2">
          {description}
        </p>
      )}
    </div>
  );
}

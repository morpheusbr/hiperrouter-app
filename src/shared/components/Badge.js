"use client";

import { cn } from "@/shared/utils/cn";

const variants = {
  default: "bg-surface-2 text-text-muted border border-border/70",
  primary: "bg-brand-500/15 text-brand-300 border border-brand-500/30",
  success: "bg-green-500/15 text-green-400 border border-green-500/30",
  warning: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  error: "bg-red-500/15 text-red-400 border border-red-500/30",
  info: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  neutral: "bg-surface-2 text-text-muted border border-border/70",
};

const sizes = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export default function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  icon,
  className,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded font-mono font-medium tracking-tight",
        variants[variant] || variants.default,
        sizes[size],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "size-1.5 rounded-full",
            variant === "success" && "bg-green-500",
            variant === "warning" && "bg-yellow-500",
            variant === "error" && "bg-red-500",
            variant === "info" && "bg-blue-500",
            variant === "primary" && "bg-brand-500",
            variant === "default" && "bg-gray-500"
          )}
        />
      )}
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      {children}
    </span>
  );
}

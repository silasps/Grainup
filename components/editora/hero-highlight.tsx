import type { ComponentType, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroHighlightProps {
  children: ReactNode;
  className?: string;
}

export function HeroHighlight({ children, className }: HeroHighlightProps) {
  return (
    <span
      className={cn(
        "relative z-0 inline-block px-1 text-brand-800 before:absolute before:inset-x-0 before:top-[0.14em] before:bottom-[-0.03em] before:-z-10 before:rounded-[3px] before:bg-white/95",
        className
      )}
    >
      {children}
    </span>
  );
}

interface HeroEyebrowProps {
  children: ReactNode;
  className?: string;
  icon: ComponentType<LucideProps>;
}

export function HeroEyebrow({ children, className, icon: Icon }: HeroEyebrowProps) {
  return (
    <div className={cn("mb-5", className)}>
      <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand/70 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full">
        <Icon className="h-3.5 w-3.5 text-brand" />
        {children}
      </span>
    </div>
  );
}

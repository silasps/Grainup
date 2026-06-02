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
    <div className={cn("flex items-center gap-3 mb-4", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-brand-800 shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-white/75 text-sm font-medium uppercase tracking-wider">
        {children}
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Tag, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

const ICON = {
  promo: Tag,
  info: Info,
  warning: AlertTriangle,
};

const COLORS = {
  promo: "from-brand/95 to-brand-700/95",
  info: "from-foreground/95 to-foreground/90",
  warning: "from-amber-600/95 to-amber-700/95",
};

const SESSION_KEY = "promo_overlay_dismissed";

export function PromoOverlay({ announcement }: { announcement: Announcement | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    const dismissed = sessionStorage.getItem(`${SESSION_KEY}_${announcement.id}`);
    if (!dismissed) setVisible(true);
  }, [announcement]);

  function dismiss() {
    if (!announcement) return;
    sessionStorage.setItem(`${SESSION_KEY}_${announcement.id}`, "1");
    setVisible(false);
  }

  if (!visible || !announcement) return null;

  const Icon = ICON[announcement.type] ?? Tag;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className={cn(
          "relative bg-gradient-to-br text-white rounded-2xl shadow-2xl max-w-md w-full p-8 flex flex-col gap-5",
          COLORS[announcement.type]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col gap-3">
          {announcement.badge && (
            <Badge className="bg-white/20 hover:bg-white/20 text-white text-xs w-fit">
              {announcement.badge}
            </Badge>
          )}
          <div className="flex items-center gap-3">
            <div className="bg-white/20 rounded-lg p-2 shrink-0">
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-heading text-xl font-bold leading-snug">{announcement.title}</h2>
          </div>
          <p className="text-white/80 text-sm leading-relaxed">{announcement.body}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {announcement.cta_label && announcement.cta_url && (
            <Button
              asChild
              className="bg-white text-foreground hover:bg-white/90 font-semibold flex-1"
              onClick={dismiss}
            >
              <Link href={announcement.cta_url}>{announcement.cta_label}</Link>
            </Button>
          )}
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white hover:bg-white/10 flex-1"
            onClick={dismiss}
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Tag, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

const ICON = { promo: Tag, info: Info, warning: AlertTriangle };

const ACCENT = {
  promo:   { bg: "bg-brand",       text: "text-brand",       ring: "ring-brand/20"   },
  info:    { bg: "bg-foreground",  text: "text-foreground",  ring: "ring-gray-200"   },
  warning: { bg: "bg-amber-500",   text: "text-amber-600",   ring: "ring-amber-200"  },
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
  const accent = ACCENT[announcement.type];
  const hasImage = !!announcement.image_url;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={dismiss}
    >
      {hasImage ? (
        /* ── Layout com imagem portrait ────────────────────────── */
        <div
          className="relative flex flex-col sm:flex-row bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-xl max-h-[90vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Imagem portrait */}
          <div className="relative w-full sm:w-52 flex-shrink-0 aspect-[2/3] sm:aspect-auto sm:h-auto">
            <Image
              src={announcement.image_url!}
              alt={announcement.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 208px"
            />
            {/* Gradiente sutil sobre a imagem em mobile */}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent sm:hidden" />
          </div>

          {/* Conteúdo */}
          <div className="flex flex-col justify-between flex-1 p-6 sm:p-8 min-h-0">
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 transition-colors bg-white/80 backdrop-blur-sm rounded-full p-1"
              aria-label="Fechar"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex flex-col gap-3 flex-1 justify-center">
              {announcement.badge && (
                <Badge className={cn("text-xs w-fit text-white", accent.bg)}>
                  {announcement.badge}
                </Badge>
              )}
              <h2 className="font-heading text-xl font-bold leading-snug text-foreground">
                {announcement.title}
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {announcement.body}
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-6">
              {announcement.cta_label && announcement.cta_url && (
                <Button
                  asChild
                  className={cn("font-semibold text-white w-full", accent.bg)}
                  onClick={dismiss}
                >
                  <Link href={announcement.cta_url}>{announcement.cta_label}</Link>
                </Button>
              )}
              <button
                onClick={dismiss}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-1"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Layout sem imagem (gradiente) ─────────────────────── */
        <div
          className="relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Faixa colorida no topo */}
          <div className={cn("h-2 w-full", accent.bg)} />

          <div className="p-8 flex flex-col gap-5">
            <button
              onClick={dismiss}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-3">
              {announcement.badge && (
                <Badge className={cn("text-xs w-fit text-white", accent.bg)}>
                  {announcement.badge}
                </Badge>
              )}
              <div className="flex items-start gap-3">
                <div className={cn("rounded-xl p-2.5 shrink-0 text-white", accent.bg)}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="font-heading text-xl font-bold leading-snug text-foreground mt-1">
                  {announcement.title}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {announcement.body}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {announcement.cta_label && announcement.cta_url && (
                <Button
                  asChild
                  className={cn("font-semibold text-white flex-1", accent.bg)}
                  onClick={dismiss}
                >
                  <Link href={announcement.cta_url}>{announcement.cta_label}</Link>
                </Button>
              )}
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground flex-1"
                onClick={dismiss}
              >
                Fechar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

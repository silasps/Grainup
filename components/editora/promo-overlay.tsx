"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];

const SESSION_KEY = "promo_overlay_dismissed";
const DELAY_MS = 8000;

export function PromoOverlay({ announcement }: { announcement: Announcement | null }) {
  const [visible, setVisible]   = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (!announcement) return;
    if (sessionStorage.getItem(`${SESSION_KEY}_${announcement.id}`)) return;
    const t = setTimeout(() => {
      setVisible(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimated(true)));
    }, DELAY_MS);
    return () => clearTimeout(t);
  }, [announcement]);

  function dismiss() {
    if (!announcement) return;
    setAnimated(false);
    setTimeout(() => {
      sessionStorage.setItem(`${SESSION_KEY}_${announcement.id}`, "1");
      setVisible(false);
    }, 180);
  }

  if (!visible || !announcement) return null;

  const hasImage  = !!announcement.image_url;
  const hasCta    = !!(announcement.cta_label && announcement.cta_url);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center p-4 transition-[background-color,backdrop-filter] duration-200",
        animated ? "bg-black/60 backdrop-blur-sm" : "bg-transparent"
      )}
      onClick={dismiss}
    >
      <div
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-sm transition-all duration-200",
          animated ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={dismiss}
          aria-label="Fechar"
          className="absolute top-3 right-3 z-20 flex items-center justify-center h-7 w-7 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Image banner */}
        {hasImage && (
          <Link
            href={hasCta ? announcement.cta_url! : "#"}
            onClick={hasCta ? dismiss : (e) => e.preventDefault()}
            className={cn("relative block w-full aspect-[2/1] overflow-hidden", hasCta && "cursor-pointer")}
          >
            <Image
              src={announcement.image_url!}
              alt={announcement.title}
              fill
              className="object-cover"
              sizes="384px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            {announcement.badge && (
              <span className="absolute bottom-3 left-4 text-[11px] font-bold uppercase tracking-wide text-white rounded-full px-2.5 py-0.5 bg-brand">
                {announcement.badge}
              </span>
            )}
          </Link>
        )}

        {/* Accent bar (no image) */}
        {!hasImage && <div className={"h-1.5 w-full bg-brand"} />}

        {/* Content */}
        <div className="px-6 pt-5 pb-6 flex flex-col gap-4">
          {!hasImage && announcement.badge && (
            <span className={"text-[11px] font-bold uppercase tracking-wide text-white rounded-full px-2.5 py-0.5 w-fit bg-brand"}>
              {announcement.badge}
            </span>
          )}

          <div className="flex flex-col gap-1.5">
            <h2 className="font-heading text-[1.25rem] font-bold leading-tight text-foreground">
              {announcement.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {announcement.body}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {hasCta && (
              <Link
                href={announcement.cta_url!}
                onClick={dismiss}
                className={"flex items-center justify-center w-full h-11 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 bg-brand"}
              >
                {announcement.cta_label}
              </Link>
            )}
            <button
              onClick={dismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

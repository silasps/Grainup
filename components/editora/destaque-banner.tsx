"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Destaque {
  id: string;
  title: string;
  image_url: string | null;
  image_mobile_url: string | null;
  video_url: string | null;
  cta_url: string | null;
  focal_x: number | null;
  focal_y: number | null;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

// ── Slide padrão (hero estático quando não há destaques ou é o slide 0) ───────
function DefaultSlide() {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 bg-[url('/textura.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-black/75 via-black/55 to-black/30" />
      <div className="absolute inset-0 flex items-center justify-center text-white px-4">
        <div className="text-center max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/60 mb-4">
            Editora Jocum Brasil
          </p>
          <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold leading-[1.05] tracking-tight text-balance mb-6">
            Livros que{" "}
            <span className="text-brand">transformam</span>{" "}
            vidas
          </h1>
          <p className="text-base sm:text-lg text-white/70 leading-relaxed mb-10 max-w-2xl mx-auto">
            Conhecer a Deus e fazê-lo conhecido. Mais de 200 títulos sobre missões,
            liderança, família, oração e vida cristã.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="bg-brand hover:bg-brand-700 text-white font-semibold px-8 h-12 text-base" asChild>
              <Link href="/editora/livros">Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="bg-transparent border-white/70 text-white hover:bg-white hover:text-primary h-12 text-base" asChild>
              <Link href="/editora/ofertas">Ver ofertas</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Slide de destaque ─────────────────────────────────────────────────────────
function DestaqueSlide({ d, priority }: { d: Destaque; priority: boolean }) {
  const fx = d.focal_x ?? 0.5;
  const fy = d.focal_y ?? 0.5;
  const objPos = `${fx * 100}% ${fy * 100}%`;

  const media = (
    <>
      {/* Mobile: usa image_mobile_url se existir, senão usa focal point da principal */}
      {(d.image_mobile_url ?? d.image_url) && (
        <div className="absolute inset-0 block sm:hidden">
          <Image
            src={(d.image_mobile_url ?? d.image_url)!}
            alt={d.title} fill priority={priority} sizes="100vw" unoptimized
            className="object-cover"
            style={{ objectPosition: d.image_mobile_url ? "center" : objPos }}
          />
        </div>
      )}
      {/* Desktop */}
      {d.image_url && (
        <div className="absolute inset-0 hidden sm:block">
          <Image
            src={d.image_url}
            alt={d.title} fill priority={priority} sizes="100vw" unoptimized
            className="object-cover"
            style={{ objectPosition: objPos }}
          />
        </div>
      )}
      {/* YouTube: só se não tiver imagem */}
      {!d.image_url && !d.image_mobile_url && d.video_url && priority && (() => {
        const ytId = getYouTubeId(d.video_url!);
        return ytId ? (
          <iframe
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1`}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media" allowFullScreen
          />
        ) : null;
      })()}
    </>
  );

  const inner = <div className="absolute inset-0">{media}</div>;

  return d.cta_url ? (
    <Link href={d.cta_url} className="absolute inset-0 block cursor-pointer" aria-label={d.title}>
      {inner}
    </Link>
  ) : inner;
}

// ── Banner principal ──────────────────────────────────────────────────────────
export function DestaqueBanner({ destaques }: { destaques: Destaque[] }) {
  const total = destaques.length + 1; // +1 para o DefaultSlide
  const [current, setCurrent] = useState(0);
  const [dragDelta, setDragDelta] = useState(0); // px de arraste em tempo real
  const paused   = useRef(false);
  const startX   = useRef<number | null>(null);
  const isDragging = useRef(false);

  const goTo  = useCallback((i: number) => setCurrent((i + total) % total), [total]);
  const next  = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev  = useCallback(() => goTo(current - 1), [current, goTo]);

  // auto-avanço — respeita prefers-reduced-motion
  useEffect(() => {
    if (total <= 1) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => { if (!paused.current) setCurrent(c => (c + 1) % total); }, 6000);
    return () => clearInterval(t);
  }, [total]);

  // ── swipe pointer ──
  function onPointerDown(e: React.PointerEvent) {
    startX.current     = e.clientX;
    isDragging.current = false;
    paused.current     = true;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 5) isDragging.current = true;
    setDragDelta(delta);
  }
  function onPointerUp(e: React.PointerEvent) {
    if (startX.current === null) return;
    const delta = e.clientX - startX.current;
    setDragDelta(0);
    startX.current = null;
    paused.current = false;
    if (Math.abs(delta) > 50) delta < 0 ? next() : prev();
  }

  // translateX total = slide atual × largura + arraste live
  // usamos CSS var para não causar reflow
  const slidePercent = (current / total) * 100;

  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white touch-pan-y cursor-grab active:cursor-grabbing"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { setDragDelta(0); startX.current = null; paused.current = false; }}
    >
      {/* Container de altura responsiva */}
      <div className="relative w-full aspect-[3/4] sm:aspect-auto sm:h-[560px]">
        {/* Track — layout flex horizontal */}
        <div
          className="flex h-full"
          style={{
            width: `${total * 100}%`,
            transform: `translateX(calc(-${slidePercent}% + ${dragDelta}px))`,
            transition: isDragging.current ? "none" : "transform 500ms cubic-bezier(.25,.46,.45,.94)",
            willChange: "transform",
          }}
        >
          {/* Slide 0: Default */}
          <div className="relative h-full flex-shrink-0" style={{ width: `${100 / total}%` }}>
            <DefaultSlide />
          </div>

          {/* Slides 1..n: Destaques */}
          {destaques.map((d, i) => (
            <div key={d.id} className="relative h-full flex-shrink-0" style={{ width: `${100 / total}%` }}>
              <DestaqueSlide d={d} priority={i + 1 === current} />
            </div>
          ))}
        </div>

        {/* Setas — só se tiver destaques */}
        {destaques.length > 0 && (
          <>
            <button onClick={prev} onPointerDown={(e) => e.stopPropagation()}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
              aria-label="Anterior">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={next} onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
              aria-label="Próximo">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {Array.from({ length: total }).map((_, i) => (
              <button key={i} onClick={() => goTo(i)} onPointerDown={(e) => e.stopPropagation()} aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

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

// ── Slide padrão — hero claro editorial (padrão Penguin / H1 / Apple Books) ──
function DefaultSlide() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#F7F4EF] via-[#F2EFE9] to-brand-50 flex items-center">
      {/* Círculos decorativos de fundo */}
      <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full bg-brand-100/40 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] left-[-60px] w-[300px] h-[300px] rounded-full bg-brand-50/60 blur-2xl pointer-events-none" />

      <div className="container mx-auto max-w-7xl px-4 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Texto */}
          <div className="text-left">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand/70 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-full mb-6">
              Editora Jocum Brasil
            </span>
            <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight text-foreground mb-5">
              Livros que{" "}
              <span className="text-brand relative">
                transformam
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M2 6 Q100 2 198 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-200"/>
                </svg>
              </span>{" "}
              vidas
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
              Conhecer a Deus e fazê-lo conhecido. Mais de 200 títulos sobre missões,
              liderança, família, oração e vida cristã.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="bg-brand hover:bg-brand-700 text-white font-semibold px-8 h-12 text-base shadow-md hover:shadow-lg" asChild>
                <Link href="/editora/livros">Ver catálogo <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="border-brand/30 text-brand hover:bg-brand-50 h-12 text-base font-semibold" asChild>
                <Link href="/editora/ofertas">Ver ofertas</Link>
              </Button>
            </div>
            {/* Social proof */}
            <div className="flex items-center gap-4 mt-8 pt-6 border-t border-border">
              <div className="text-center">
                <p className="font-bold text-foreground text-lg leading-none">200+</p>
                <p className="text-xs text-muted-foreground mt-0.5">títulos</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="font-bold text-foreground text-lg leading-none">50+</p>
                <p className="text-xs text-muted-foreground mt-0.5">países</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="font-bold text-foreground text-lg leading-none">60 anos</p>
                <p className="text-xs text-muted-foreground mt-0.5">de missão</p>
              </div>
            </div>
          </div>

          {/* Grade de capas — decorativa */}
          <div className="hidden lg:grid grid-cols-3 gap-3 py-6">
            {[
              { rotate: "-rotate-3", delay: "", top: "mt-6" },
              { rotate: "rotate-1",  delay: "",  top: "" },
              { rotate: "-rotate-2", delay: "",  top: "mt-10" },
            ].map(({ rotate, top }, i) => (
              <div key={i} className={`${top} ${rotate} transition-transform duration-500 hover:rotate-0 hover:scale-105`}>
                <div className="aspect-[2/3] rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 shadow-[0_8px_24px_rgba(0,0,0,0.15)] overflow-hidden flex items-center justify-center">
                  <span className="text-4xl opacity-30">📖</span>
                </div>
              </div>
            ))}
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

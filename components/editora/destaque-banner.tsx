"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Destaque {
  id: string;
  title: string;
  image_url: string | null;
  video_url: string | null;
  cta_url: string | null;
}

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|v=|embed\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

// Slide padrão sempre presente
function DefaultSlide({ active }: { active: boolean }) {
  return (
    <div
      className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
    >
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
              <Link href="/editora/livros">
                Ver catálogo completo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
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

function DestaqueSlide({ d, active }: { d: Destaque; active: boolean }) {
  const cls = `absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`;

  const media = d.image_url ? (
    <Image src={d.image_url} alt={d.title} fill className="object-cover object-center" priority={active} sizes="100vw" unoptimized />
  ) : d.video_url ? (
    active ? (
      <iframe
        src={`https://www.youtube.com/embed/${getYouTubeId(d.video_url)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeId(d.video_url)}&controls=0&modestbranding=1`}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    ) : null
  ) : null;

  if (!media) return null;

  const content = (
    <div className={cls}>
      <div className="absolute inset-0 bg-black/20" />
      {media}
      <div className="absolute inset-0 flex items-end justify-start px-8 pb-10 z-10">
        <div className="text-white max-w-lg">
          <p className="font-heading text-2xl sm:text-4xl font-bold drop-shadow-lg">{d.title}</p>
          {d.cta_url && (
            <Button size="sm" className="mt-4 bg-brand hover:bg-brand-700 text-white" asChild>
              <Link href={d.cta_url}>Ver mais</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return content;
}

export function DestaqueBanner({ destaques }: { destaques: Destaque[] }) {
  const total = destaques.length + 1; // +1 for default slide
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCurrent((c) => (c + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + total) % total), [total]);

  useEffect(() => {
    if (total <= 1 || paused) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [total, paused, next]);

  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* 56vw mobile → 520px desktop min-height */}
      <div className="relative w-full" style={{ paddingBottom: "clamp(400px, 56vw, 620px)" }}>
        {/* Slide 0: default */}
        <DefaultSlide active={current === 0} />

        {/* Slides 1..n: destaques */}
        {destaques.map((d, i) => (
          <DestaqueSlide key={d.id} d={d} active={current === i + 1} />
        ))}

        {/* Setas — só se tiver destaques */}
        {destaques.length > 0 && (
          <>
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {Array.from({ length: total }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

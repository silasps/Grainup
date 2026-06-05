"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

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

function Slide({ d, active }: { d: Destaque; active: boolean }) {
  const inner = d.image_url ? (
    <div className="absolute inset-0">
      <Image
        src={d.image_url}
        alt={d.title}
        fill
        className="object-cover object-center"
        priority={active}
        sizes="100vw"
        unoptimized
      />
    </div>
  ) : d.video_url ? (
    <div className="absolute inset-0 bg-black">
      {active && (
        <iframe
          src={`https://www.youtube.com/embed/${getYouTubeId(d.video_url)}?autoplay=1&mute=1&loop=1&playlist=${getYouTubeId(d.video_url)}&controls=0&modestbranding=1`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      )}
    </div>
  ) : null;

  if (!inner) return null;

  const className = `absolute inset-0 transition-opacity duration-700 ${
    active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
  }`;

  return d.cta_url ? (
    <Link href={d.cta_url} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}

export function DestaqueBanner({ destaques }: { destaques: Destaque[] }) {
  const [current, setCurrent] = useState(0);
  const count = destaques.length;

  const next = useCallback(() => setCurrent((c) => (c + 1) % count), [count]);

  useEffect(() => {
    if (count <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [count, next]);

  if (count === 0) return null;

  return (
    <section className="w-full overflow-hidden bg-muted">
      {/* aspect-ratio placeholder: 4:3 mobile, 16:5 desktop */}
      <div className="relative aspect-[4/3] sm:aspect-[16/5] w-full">
        {destaques.map((d, i) => (
          <Slide key={d.id} d={d} active={i === current} />
        ))}

        {/* dot indicators */}
        {count > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-20">
            {destaques.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Slide ${i + 1}`}
                onClick={() => setCurrent(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WatermarkOverlay } from "./watermark-overlay";
import { Loader2 } from "lucide-react";

interface Props {
  lessonId:        string;
  watermarkText:   string;  // e.g. "João Silva • joao@email.com"
  initialPositionS?: number;
}

export function VideoPlayer({ lessonId, watermarkText, initialPositionS = 0 }: Props) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastBeaconRef = useRef<number>(0);
  const completedRef = useRef(false);

  // Fetch signed URL from our server action
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/ead/bunny-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          setSignedUrl(data.signedUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Não foi possível carregar o vídeo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [lessonId]);

  // Listen to Bunny postMessage events for progress tracking
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.data || typeof event.data !== "object") return;
      const { event: evtName, seconds, duration } = event.data as {
        event: string;
        seconds?: number;
        duration?: number;
      };

      if (evtName === "timeupdate" && seconds !== undefined) {
        const now = Date.now();
        // Beacon every 15 seconds
        if (now - lastBeaconRef.current > 15_000) {
          lastBeaconRef.current = now;
          const completed =
            !completedRef.current &&
            duration !== undefined &&
            seconds / duration >= 0.85;

          if (completed) completedRef.current = true;

          navigator.sendBeacon(
            "/api/ead/video-progress",
            JSON.stringify({
              lessonId,
              positionS:   Math.round(seconds),
              watchTimeS:  15,
              completed:   completed || undefined,
            })
          );
        }
      }
    },
    [lessonId]
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  if (loading) {
    return (
      <div className="aspect-video bg-black flex items-center justify-center rounded-xl">
        <Loader2 className="h-8 w-8 text-white/60 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video bg-black/90 flex flex-col items-center justify-center rounded-xl text-center px-6">
        <p className="text-white/80 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
      <iframe
        src={`${signedUrl}&autoplay=0&t=${initialPositionS}`}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        title="Aula"
      />
      <WatermarkOverlay text={watermarkText} />
    </div>
  );
}

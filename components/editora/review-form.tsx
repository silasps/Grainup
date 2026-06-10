"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReviewAction } from "@/app/(editora)/editora/livros/[slug]/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ReviewForm({ bookId, bookTitle }: { bookId: string; bookTitle: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { toast.error("Selecione uma nota de 1 a 5 estrelas"); return; }
    setLoading(true);
    const { error } = await submitReviewAction({ bookId, rating, title: title.trim(), body: body.trim() });
    setLoading(false);
    if (error) {
      toast.error(error);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} className={cn("h-6 w-6", s <= rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted")} />
          ))}
        </div>
        <p className="font-semibold">Obrigado pela sua avaliação!</p>
        <p className="text-sm text-muted-foreground">Ela será publicada após aprovação.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label className="mb-2 block">Sua nota para <strong>{bookTitle}</strong></Label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRating(s)}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              className="p-0.5"
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  s <= (hover || rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-title">Título (opcional)</Label>
        <Input
          id="review-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Resumo da sua experiência"
          maxLength={100}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="review-body">Comentário (opcional)</Label>
        <Textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="O que você achou do livro?"
          rows={4}
          maxLength={1000}
        />
      </div>
      <Button type="submit" disabled={loading || rating === 0} className="bg-brand hover:bg-brand-700 text-white">
        {loading ? "Enviando…" : "Enviar avaliação"}
      </Button>
    </form>
  );
}

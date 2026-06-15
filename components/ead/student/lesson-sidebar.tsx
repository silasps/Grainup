"use client";

import Link from "next/link";
import { CheckCircle2, Circle, Lock, ChevronDown, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EadModuleWithLessons, EadLessonWithProgress } from "@/types/ead";

interface Props {
  courseSlug:     string;
  modules:        EadModuleWithLessons[];
  activeLessonId: string;
  primaryColor:   string;
  progressPercent: number;
}

export function LessonSidebar({ courseSlug, modules, activeLessonId, primaryColor, progressPercent }: Props) {
  function getIcon(lesson: EadLessonWithProgress, available: boolean) {
    if (lesson.completed) return <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />;
    if (!available) return <Lock className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />;
    return <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />;
  }

  return (
    <aside className="flex flex-col h-full overflow-y-auto bg-white border-l border-border">
      {/* Progress header */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between text-xs font-medium mb-2">
          <span className="text-muted-foreground">Progresso do curso</span>
          <span style={{ color: primaryColor }}>{progressPercent}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progressPercent}%`, background: primaryColor }}
          />
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto">
        {modules.map((mod, mIdx) => {
          const completedLessons = mod.lessons.filter((l) => l.completed).length;
          const isOpen = mod.lessons.some((l) => l.id === activeLessonId);

          return (
            <details key={mod.id} open={isOpen || mIdx === 0} className="group">
              <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none sticky top-0 bg-white z-10 border-b border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 text-white"
                    style={{ background: primaryColor }}
                  >
                    {mIdx + 1}
                  </span>
                  <span className="text-xs font-semibold truncate">{mod.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                  <span>{completedLessons}/{mod.lessons.length}</span>
                  <ChevronDown className="h-3.5 w-3.5 group-open:rotate-180 transition-transform" />
                </div>
              </summary>

              <div>
                {mod.lessons.map((lesson) => {
                  const isActive = lesson.id === activeLessonId;
                  const available = lesson.is_free_preview || !lesson.publish_at || new Date(lesson.publish_at) <= new Date();

                  return (
                    <Link
                      key={lesson.id}
                      href={available ? `/ead/curso/${courseSlug}/${lesson.slug}` : "#"}
                      className={cn(
                        "flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors border-b border-border/50",
                        isActive
                          ? "text-white"
                          : available
                          ? "hover:bg-muted/30 text-foreground/80"
                          : "opacity-50 cursor-not-allowed"
                      )}
                      style={isActive ? { background: primaryColor } : {}}
                    >
                      {getIcon(lesson, available)}
                      <span className="flex-1 leading-snug">{lesson.title}</span>
                      {lesson.duration_s && lesson.duration_s > 0 && (
                        <span className={cn("text-[10px] flex-shrink-0", isActive ? "text-white/70" : "text-muted-foreground")}>
                          {Math.ceil(lesson.duration_s / 60)}min
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}

        {modules.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">Nenhum conteúdo disponível.</p>
          </div>
        )}
      </div>
    </aside>
  );
}

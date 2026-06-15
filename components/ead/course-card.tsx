import Link from "next/link";
import Image from "next/image";
import { Star, Clock, Users, BookOpen, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
}

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  price: number;
  price_promotional: number | null;
  is_free: boolean;
  total_lessons: number;
  total_duration_s: number;
  level: string | null;
  is_featured: boolean;
  enrolled?: boolean;
  progress_percent?: number;
  rating_avg?: number;
  rating_count?: number;
  enrolled_count?: number;
}

interface Props {
  course: CourseCardData;
  primaryColor?: string;
  className?: string;
}

const LEVEL_LABEL: Record<string, string> = {
  iniciante:     "Iniciante",
  intermediario: "Intermediário",
  avancado:      "Avançado",
};

export function CourseCard({ course, primaryColor = "#1B4332", className }: Props) {
  const displayPrice = course.price_promotional ?? course.price;
  const hasDiscount = course.price_promotional !== null && course.price_promotional < course.price;

  return (
    <Link
      href={course.enrolled ? `/ead/curso/${course.slug}` : `/ead/cursos/${course.slug}`}
      className={cn(
        "group flex flex-col bg-white rounded-2xl border border-border overflow-hidden",
        "hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200",
        className
      )}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, ${primaryColor}55 100%)` }}
          >
            <BookOpen className="h-10 w-10" style={{ color: primaryColor }} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
          {course.is_free && (
            <Badge className="bg-emerald-500 text-white border-0 text-xs font-bold uppercase tracking-wide">
              Grátis
            </Badge>
          )}
          {course.is_featured && !course.is_free && (
            <Badge className="bg-amber-400 text-amber-900 border-0 text-xs font-bold">
              Destaque
            </Badge>
          )}
          {course.level && (
            <Badge variant="secondary" className="text-xs bg-white/90 text-foreground border-0">
              {LEVEL_LABEL[course.level] ?? course.level}
            </Badge>
          )}
        </div>

        {/* Progress bar for enrolled courses */}
        {course.enrolled && course.progress_percent !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <div
              className="h-full transition-all"
              style={{ width: `${course.progress_percent}%`, background: primaryColor }}
            />
          </div>
        )}

        {/* Lock for non-enrolled */}
        {!course.enrolled && !course.is_free && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
              <Lock className="h-5 w-5 text-foreground/70" />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <h3 className="font-heading font-semibold text-sm leading-snug line-clamp-2 text-foreground group-hover:text-brand transition-colors">
          {course.title}
        </h3>

        {course.instructor_name && (
          <p className="text-xs text-muted-foreground">{course.instructor_name}</p>
        )}

        {/* Rating + students */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-auto pt-2">
          {course.rating_avg && course.rating_avg > 0 ? (
            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
              <Star className="h-3 w-3 fill-current" />
              {course.rating_avg.toFixed(1)}
              <span className="text-muted-foreground font-normal ml-0.5">({course.rating_count ?? 0})</span>
            </span>
          ) : null}

          {course.enrolled_count !== undefined && course.enrolled_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {course.enrolled_count.toLocaleString("pt-BR")}
            </span>
          )}

          {course.total_duration_s > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock className="h-3 w-3" />
              {formatDuration(course.total_duration_s)}
            </span>
          )}
        </div>

        {/* Price */}
        {!course.enrolled && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            {course.is_free ? (
              <span className="font-bold text-emerald-600">Gratuito</span>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base" style={{ color: primaryColor }}>
                  {formatPrice(displayPrice)}
                </span>
                {hasDiscount && (
                  <span className="text-xs text-muted-foreground line-through">
                    {formatPrice(course.price)}
                  </span>
                )}
              </div>
            )}
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `${primaryColor}18`, color: primaryColor }}
            >
              {course.total_lessons} aulas
            </span>
          </div>
        )}

        {course.enrolled && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">
              {course.progress_percent === 100 ? "Concluído!" : `${Math.round(course.progress_percent ?? 0)}% concluído`}
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: primaryColor }}
            >
              Continuar →
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

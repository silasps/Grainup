import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  imageClassName?: string;
  variant?: "default" | "white";
  href?: string;
}

export function Logo({ className, imageClassName, variant = "default", href = "/editora" }: LogoProps) {
  const content = (
    <div className={cn("flex items-center shrink-0", className)}>
      <Image
        src={variant === "white" ? "/logo-editora-jocum-branca.png" : "/logo-editora-jocum.png"}
        alt="Editora Jocum"
        width={120}
        height={40}
        className={cn("h-8 w-auto min-w-[80px] object-contain md:h-10", imageClassName)}
        priority
      />
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm">
      {content}
    </Link>
  );
}

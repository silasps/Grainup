import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "white";
  href?: string;
}

export function Logo({ className, variant = "default", href = "/editora" }: LogoProps) {
  const content = (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/logo-editora-jocum.jpeg"
        alt="Editora Jocum"
        width={120}
        height={40}
        className={cn("h-10 w-auto object-contain", variant === "white" && "brightness-0 invert")}
        priority
      />
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} className="outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-sm">
      {content}
    </Link>
  );
}

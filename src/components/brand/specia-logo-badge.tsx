import Image from "next/image";

import { cn } from "@/lib/utils";

export function SpeciaLogoBadge({
  className,
  imageClassName,
  size = "md",
  variant = "black",
  frameTone = "none",
}: {
  className?: string;
  imageClassName?: string;
  size?: "xs" | "sm" | "md" | "lg";
  // "auto" temaya göre otomatik geçer (koyu temada beyaz, açık temada siyah logo).
  variant?: "black" | "white" | "auto";
  frameTone?: "light" | "dark" | "none";
}) {
  const sizeClasses =
    size === "xs"
      ? "rounded-xl px-3 py-2.5"
      : size === "sm"
        ? "rounded-2xl px-3.5 py-3"
        : size === "lg"
          ? "rounded-[var(--panel-radius-card)] px-6 py-4"
          : "rounded-[var(--panel-radius-card)] px-4.5 py-3.5";

  const imageSizes =
    size === "xs"
      ? { width: 80, height: 60 }
      : size === "sm"
        ? { width: 96, height: 72 }
        : size === "lg"
          ? { width: 164, height: 123 }
          : { width: 126, height: 95 };

  const frameClasses =
    frameTone === "dark"
      ? "border border-white/10 bg-black text-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.65)]"
      : frameTone === "none"
        ? "border border-transparent bg-transparent shadow-none"
        : "border border-black/8 bg-white shadow-[0_18px_50px_-30px_rgba(255,255,255,0.55)]";

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        frameClasses,
        sizeClasses,
        className,
      )}
    >
      {variant === "auto" ? (
        <>
          <Image
            src="/specia-logo-white.png"
            alt="Specia logosu"
            width={imageSizes.width}
            height={imageSizes.height}
            className={cn("brand-logo-dark h-auto w-auto", imageClassName)}
            priority
          />
          <Image
            src="/specia-logo-black.png"
            alt="Specia logosu"
            width={imageSizes.width}
            height={imageSizes.height}
            className={cn("brand-logo-light h-auto w-auto", imageClassName)}
            priority
          />
        </>
      ) : (
        <Image
          src={variant === "white" ? "/specia-logo-white.png" : "/specia-logo-black.png"}
          alt="Specia logosu"
          width={imageSizes.width}
          height={imageSizes.height}
          className={cn("h-auto w-auto", imageClassName)}
          priority
        />
      )}
    </div>
  );
}

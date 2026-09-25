import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Marque Quality Manager — fichiers du kit officiel (public/brand).
 * Le symbole est identique en clair et en sombre ; le logo complet a
 * deux variantes, permutées par le thème via les classes `qm-only-*`.
 */

export function QmSymbol({
  size = 38,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/brand/quality-manager-symbol.svg"
      alt="Quality Manager"
      width={size}
      height={size}
      priority={priority}
      className={cn("select-none", className)}
    />
  );
}

/**
 * Marque du menu latéral : le carré violet des maquettes (`.brand-mark`),
 * avec à l'intérieur le symbole blanc du kit officiel.
 */
export function QmBrandMark({
  size = 38,
  className,
  priority = false,
}: {
  size?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#2C5A9E] via-[#6B4FBB] to-[#9474FF]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_8px_24px_-8px_rgba(107,79,187,0.7)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/quality-manager-symbol-white.svg"
        alt="Quality Manager"
        width={Math.round(size * 0.62)}
        height={Math.round(size * 0.62)}
        priority={priority}
        className="select-none"
      />
    </span>
  );
}

export function QmLogo({
  width = 220,
  className,
  priority = false,
}: {
  width?: number;
  className?: string;
  priority?: boolean;
}) {
  const height = Math.round((width * 180) / 1060); // ratio du logo horizontal (viewBox 1060×180)

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/brand/quality-manager-logo-dark.svg"
        alt="Quality Manager"
        width={width}
        height={height}
        priority={priority}
        className="qm-only-dark"
      />
      <Image
        src="/brand/quality-manager-logo-light.svg"
        alt="Quality Manager"
        width={width}
        height={height}
        priority={priority}
        className="qm-only-light"
      />
    </span>
  );
}

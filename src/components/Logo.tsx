"use client";

interface LogoProps {
  size?: "sm" | "md" | "lg" | (string & {});
  className?: string;
  variant?: "light" | "dark" | (string & {});
  href?: string;
  /**
   * Wordmark accent colour. Inline style on purpose: Tailwind v4 does not
   * reliably generate color utilities from `text-[var(--x)]`, so brand
   * colours here bypass utilities entirely. Defaults to Zobo everywhere.
   */
  accentColor?: string;
}

export default function Logo({ size = "md", className = "", variant = "light", href = "/", accentColor = "var(--zobo)" }: LogoProps) {
  const sizes: Record<string, string> = {
    sm: "h-7 w-7",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };
  const textSizes: Record<string, string> = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };
  const isDark = variant === "dark";
  return (
    <a
      href={href}
      aria-label="ClockHost"
      className={`inline-flex items-center gap-2 font-bold tracking-tight ${className} ${isDark ? "text-white" : "text-(--color-ink)"}`}
      style={{ fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif" }}
    >
      <img
        src="/logo.svg"
        alt=""
        className={`${sizes[size] || sizes.md} shrink-0 rounded-lg`}
        width={32}
        height={32}
      />
      <span className={`${textSizes[size] || textSizes.md}`}>
        Clock<span className={textSizes[size] || textSizes.md} style={{ color: accentColor }}>Host</span>
      </span>
    </a>
  );
}

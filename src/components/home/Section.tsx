interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export function SectionContainer({ children, className = "", id }: SectionContainerProps) {
  return (
    <section id={id} className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>
      {children}
    </section>
  );
}

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}

export function SectionHeading({ eyebrow, title, subtitle, center = true }: SectionHeadingProps) {
  return (
    <div className={`mb-10 sm:mb-12 ${center ? "mx-auto max-w-2xl text-center" : ""}`}>
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--color-gold)]">{eyebrow}</p>
      )}
      <h2 className="font-serif-display text-3xl font-semibold tracking-tight text-[var(--color-night-text)] sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-night-muted)] sm:text-base">{subtitle}</p>
      )}
    </div>
  );
}

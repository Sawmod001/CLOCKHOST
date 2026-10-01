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
  /** Kept for prop compatibility; eyebrows are banned so it is not rendered. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  center?: boolean;
}

export function SectionHeading({ title, subtitle, center = true }: SectionHeadingProps) {
  return (
    <div className={`mb-10 sm:mb-12 ${center ? "mx-auto max-w-2xl text-center" : ""}`}>
      <h2 className="section-title t-1 text-h2">
        {title}
      </h2>
      {subtitle && (
        <p className={`section-sub t-2 mt-4 ${center ? "mx-auto" : ""}`}>{subtitle}</p>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { IMAGES, type SiteImage } from "@/config/images";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HeroProps {
  gate: GateHandler;
}

const SUB =
  "Reviewed venues and shortlet apartments across Nigeria. Check real availability, compare what each space offers and book with confidence.";

/**
 * Hero — docs/02 (Hero) + docs/03 (Hero) + docs/04.
 * Split panel, one bold H1, one button, real photo at full opacity.
 * No chip, no fine print. CSS-only load sequence (<600ms, once).
 */
export default function Hero({ gate }: HeroProps) {
  const slides = [IMAGES.heroPrimary, IMAGES.heroSecond, IMAGES.heroThird].filter(
    (s): s is SiteImage => !!s
  );

  return (
    <section aria-labelledby="hero-title" className="surface-paper full-bleed hero-weave">
      <div className="hero">
        <div className="hero__copy">
          <h1
            id="hero-title"
            className="hero-title t-1 hero-load hero-load-1 text-hero"
          >
            Find a space that fits{" "}
            <span className="block">your plans.</span>
          </h1>
          <p className="hero-sub mt-6" aria-label={SUB}>
            {SUB.split(" ").map((word, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="hero-word"
                style={{ animationDelay: `${0.3 + i * 0.04}s` }}
              >
                {word}
              </span>
            ))}
          </p>
          <div className="hero-load hero-load-3 mt-10">
            <Link
              href="/listings"
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings")}
              className="btn w-full sm:w-auto"
            >
              Browse spaces
            </Link>
          </div>
        </div>
        <div className="hero__media hero-photo-load">
          <div className="hero-slides">
          {slides.map((slide, i) => (
            <div key={slide.id} className="hero-slide" aria-hidden={i !== 0}>
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
                sizes="(min-width: 900px) 55vw, 100vw"
                className="object-cover"
                style={{ objectPosition: slide.objectPosition ?? "50% 30%" }}
              />
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}

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
  const photo: SiteImage = IMAGES.heroPrimary ?? {
    id: "hero-primary",
    src: "/images/hero/hero-primary-4x5.jpg",
    width: 736,
    height: 920,
    alt: "Guests toasting drinks at a warmly lit bar",
    source: "owner-supplied",
  };

  return (
    <section aria-labelledby="hero-title" className="surface-paper full-bleed">
      <div className="hero">
        <div className="hero__copy">
          <h1
            id="hero-title"
            className="hero-title t-1 hero-load hero-load-1 text-hero"
          >
            Find a space that fits{" "}
            <span className="block">your plans.</span>
          </h1>
          <p className="t-2 mt-6 max-w-[46ch] text-lead" aria-label={SUB}>
            {SUB.split(" ").map((word, i, arr) => (
              <span
                key={i}
                aria-hidden="true"
                className="hero-word"
                style={{ animationDelay: `${0.3 + i * 0.04}s` }}
              >
                {word}
                {i < arr.length - 1 ? " " : ""}
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
          <Image
            src={photo.src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            priority
            sizes="(min-width: 900px) 55vw, 100vw"
            className="h-full w-full object-cover"
            style={{ objectPosition: photo.objectPosition ?? "50% 28%" }}
          />
        </div>
      </div>
    </section>
  );
}

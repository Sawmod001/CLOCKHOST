"use client";

import Link from "next/link";
import Image from "next/image";
import { IMAGES } from "@/config/images";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HostCtaProps {
  gate: GateHandler;
}

/**
 * HostCta — docs/02 (Host CTA) + docs/03.
 * Paper. One primary button, two overlapping photos (second offset 24px —
 * controlled irregularity), host types as an open hairline list.
 * No "See how hosting works" link: no real destination exists yet (TODO).
 */
export default function HostCta({ gate }: HostCtaProps) {
  const venue = IMAGES.hostVenue;
  const shortlet = IMAGES.hostShortlet;

  return (
    <section aria-labelledby="host-title" className="surface-paper weave-soft">
      <div className="page section--lg">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 id="host-title" className="section-title t-1 text-section">
              Have a space people would love?
            </h2>
            <p className="section-sub t-2 mt-4">
              List it on ClockHost. Reach guests in Ilorin and get paid
              securely through Paystack.
            </p>
            <div className="mt-8">
              <Link
                href="/sign-up"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/sign-up")}
                className="btn w-full sm:w-auto"
              >
                Become a host
              </Link>
              {/* TODO: "See how hosting works" needs a real destination (hosting guide page or anchor). Do not point it at /listings. */}
            </div>
            <dl className="rule-list mt-10 grid gap-6 sm:grid-cols-2">
              <div className="pt-4">
                <dt className="t-1 font-semibold">Venue host</dt>
                <dd className="section-sub t-2 mt-1">
                  List one venue or outdoor space, with clear availability and pricing.
                </dd>
              </div>
              <div className="pt-4">
                <dt className="t-1 font-semibold">Shortlet host</dt>
                <dd className="section-sub t-2 mt-1">
                  List several apartments, with monthly pricing and viewings.
                </dd>
              </div>
            </dl>
          </div>

          <div className="grid grid-cols-2 items-start gap-4">
            {venue && (
              <span className="relative block aspect-[4/5] overflow-hidden rounded-panel">
                <Image
                  src={venue.src}
                  alt={venue.alt}
                  fill
                  loading="lazy"
                  sizes="(min-width: 900px) 25vw, 45vw"
                  className="object-cover"
                  style={{ objectPosition: venue.objectPosition ?? "50% 50%" }}
                />
              </span>
            )}
            {shortlet && (
              <span className="relative mt-6 block aspect-[4/5] overflow-hidden rounded-panel">
                <Image
                  src={shortlet.src}
                  alt={shortlet.alt}
                  fill
                  loading="lazy"
                  sizes="(min-width: 900px) 25vw, 45vw"
                  className="object-cover"
                  style={{ objectPosition: shortlet.objectPosition ?? "50% 50%" }}
                />
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from "next/link";
import { MapPin, Building2, Home, ArrowRight } from "lucide-react";
import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

export interface FeaturedListing {
  id: string;
  title?: string;
  vertical?: string;
  listingType?: string;
  subVertical?: string | string[];
  media?: string[];
  location?: {
    cityArea?: string;
    state?: string;
  };
  pricing?: {
    monthlyRateKobo?: number;
    nightlyRateKobo?: number;
    baseRatePerHour?: number;
    baseRate?: number;
  };
  housingDetails?: {
    monthlyRateKobo?: number;
    nightlyRateKobo?: number;
  };
}

interface FeaturedSpacesProps {
  listings: FeaturedListing[];
  gate: GateHandler;
  loading?: boolean;
  title?: string;
  subtitle?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
}

const VERTICAL_ICONS: Record<string, typeof Building2> = { venue: Building2, housing: Home };

function formatPrice(listing: FeaturedListing): string {
  if (listing.vertical === "housing" || listing.listingType === "housing" || listing.vertical === "shortlet") {
    const monthly = listing.pricing?.monthlyRateKobo ?? listing.housingDetails?.monthlyRateKobo;
    const nightly = listing.pricing?.nightlyRateKobo ?? listing.housingDetails?.nightlyRateKobo;
    const kobo = monthly ?? nightly ?? 0;
    if (!kobo) return "Price on request";
    const period = monthly ? "/mo" : "/night";
    return `₦${(kobo / 100).toLocaleString()}${period}`;
  }
  const kobo = listing.pricing?.baseRatePerHour ?? listing.pricing?.baseRate ?? 0;
  if (!kobo) return "Price on request";
  return `₦${(kobo / 100).toLocaleString()} /hr`;
}

export default function FeaturedSpaces({ listings, gate, loading, title, subtitle, emptyTitle, emptySubtitle }: FeaturedSpacesProps) {
  return (
    <SectionContainer id="featured" className="bg-[var(--color-night)] py-16 sm:py-24">
      <SectionHeading
        eyebrow="Featured spaces"
        title={title || "Popular venues near you"}
        subtitle={subtitle || "Handpicked spaces that are ready to book right now."}
      />

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)]">
              <div className="h-48 animate-pulse bg-[var(--color-night-elevated)]" />
              <div className="space-y-2 p-5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-[var(--color-night-elevated)]" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-[var(--color-night-elevated)]" />
              </div>
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-night-border)] bg-[var(--color-night-card)] p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)]">
            <Building2 size={28} aria-hidden="true" />
          </div>
          <h3 className="font-serif-display text-xl font-semibold text-[var(--color-night-text)]">
            {emptyTitle || "New spaces are on the way"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--color-night-muted)]">
            {emptySubtitle || "We are onboarding hosts. Stay close, the first venues go live very soon."}
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/notify" className="btn-outline-night btn-outline-night-sm inline-flex min-h-[44px] items-center justify-center">
              Get notified
            </Link>
            <Link href="/sign-up" onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/sign-up")} className="btn-outline-night btn-outline-night-sm inline-flex min-h-[44px] items-center justify-center">
              Become a Host
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, i: number) => {
            const Icon = VERTICAL_ICONS[listing.vertical ?? ""] || Building2;
            const subVerticals: string[] = Array.isArray(listing.subVertical)
              ? listing.subVertical
              : listing.subVertical
                ? [listing.subVertical]
                : [];
            return (
              <Reveal key={listing.id} delay={(i % 3) * 80} className="h-full">
                <a
                  href={`/listings/${listing.id}`}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, `/listings/${listing.id}`)}
                  className="group block h-full overflow-hidden rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--color-flame-bright)]/40 hover:shadow-xl"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-night-elevated)]">
                    {listing.media?.[0] ? (
                      <img
                        src={listing.media[0]}
                        alt={listing.title}
                        width={640}
                        height={480}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Icon size={48} className="text-[var(--color-night-muted)]" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute bottom-3 left-3 z-10 rounded-lg border border-[var(--color-night-border)] bg-[var(--color-night)]/85 px-3 py-1.5 text-sm font-bold text-[var(--color-night-text)] backdrop-blur-sm">
                      {formatPrice(listing)}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="break-words font-semibold text-[var(--color-night-text)] transition-colors group-hover:text-[var(--color-flame-bright)]">
                      {listing.title}
                    </h3>
                    <div className="mt-1 flex min-w-0 items-center gap-1 text-xs text-[var(--color-night-muted)]">
                      <MapPin size={12} className="shrink-0" aria-hidden="true" /> <span className="truncate">{listing.location?.cityArea}, {listing.location?.state}</span>
                    </div>
                    {subVerticals.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {subVerticals.map((sv) => (
                          <span
                            key={sv}
                            className="rounded-full bg-[var(--color-flame)]/15 px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--color-flame-bright)]"
                          >
                            {sv.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="mt-10 text-center">
          <Link
            href="/listings"
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/listings")}
            className="btn-outline-night btn-outline-night-sm inline-flex min-h-[44px] items-center gap-2"
          >
            View all spaces <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </SectionContainer>
  );
}

import Link from "next/link";
import Image from "next/image";
import { MapPin, Building2, Home, BadgeCheck } from "lucide-react";
import { Price } from "./Price";

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
  /** "paper" (venues) or "haze" (shortlets). Defaults to paper. */
  surface?: "paper" | "haze";
  /** Section anchor id. Pass distinct ids when mounted twice. */
  sectionId?: string;
  /** Footer explore link. */
  exploreLabel?: string;
  exploreHref?: string;
}

const VERTICAL_ICONS: Record<string, typeof Building2> = { venue: Building2, housing: Home };

function priceParts(listing: FeaturedListing): { amount: number; unit?: string } | null {
  const isHousing =
    listing.vertical === "housing" ||
    listing.listingType === "housing" ||
    listing.vertical === "shortlet";
  if (isHousing) {
    const monthly = listing.pricing?.monthlyRateKobo ?? listing.housingDetails?.monthlyRateKobo;
    const nightly = listing.pricing?.nightlyRateKobo ?? listing.housingDetails?.nightlyRateKobo;
    const kobo = monthly ?? nightly ?? 0;
    if (!kobo) return null;
    return { amount: kobo / 100, unit: monthly ? "/mo" : "/night" };
  }
  const kobo = listing.pricing?.baseRatePerHour ?? listing.pricing?.baseRate ?? 0;
  if (!kobo) return null;
  return { amount: kobo / 100, unit: "/hr" };
}

/**
 * FeaturedSpaces — docs/02 (Featured) + docs/03 + docs/06 Prompt 6.
 * Listing = image + text on the section surface. No background, border or
 * shadow. Lead spans 2 columns (16:10), rest 4:5, container queries +
 * subgrid. Mobile: scroll-snap row. Static Haze skeletons, no shimmer.
 */
export default function FeaturedSpaces({
  listings,
  gate,
  loading,
  title,
  subtitle,
  emptyTitle,
  emptySubtitle,
  surface = "paper",
  sectionId = "featured",
  exploreLabel = "Explore all",
  exploreHref = "/listings",
}: FeaturedSpacesProps) {
  const surfaceClass = surface === "haze" ? "surface-haze surface-grain" : "surface-paper wash-haze";

  return (
    <section aria-labelledby={`${sectionId}-title`} className={surfaceClass}>
      <div className="page section">
        <div className="section-head">
          <h2 id={`${sectionId}-title`} className="section-title t-1 text-h2">
            {title || "Places worth discovering"}
          </h2>
          <p className="section-sub t-2">
            {subtitle || "Real venues, real photos, real availability."}
          </p>
        </div>

        {loading ? (
          <div className="listing-row mt-10" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className={i === 0 ? "listing listing--lead" : "listing"}>
                <div className="listing__media rounded-control bg-[var(--haze)]" />
                <div className="h-5 w-3/4 rounded bg-[var(--haze)]" />
                <div className="h-4 w-1/2 rounded bg-[var(--haze)]" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-8 max-w-xl">
            <h3 className="section-title t-1 text-h3">
              {emptyTitle || "No spaces yet"}
            </h3>
            <p className="section-sub t-2 mt-3">
              {emptySubtitle || "We are onboarding hosts now."}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/notify" className="btn w-full sm:w-auto">
                Get notified
              </Link>
              <Link
                href="/sign-up"
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, "/sign-up")}
                className="btn-quiet w-full sm:w-auto"
              >
                Become a host
              </Link>
            </div>
          </div>
        ) : (
          <ul className="listing-row mt-10">
            {listings.map((listing, i: number) => {
              const Icon = VERTICAL_ICONS[listing.vertical ?? ""] || Building2;
              const area = [listing.location?.cityArea, listing.location?.state]
                .filter(Boolean)
                .join(", ");
              const price = priceParts(listing);
              const href = `/listings/${listing.id}`;
              return (
                <li key={listing.id} className={i === 0 ? "listing listing--lead" : "listing"}>
                  <article>
                    <Link
                      href={href}
                      onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, href)}
                      className="group block min-h-[44px]"
                      aria-label={`${listing.title}${area ? `, ${area}` : ""}`}
                    >
                      <span className="listing__media relative block overflow-hidden rounded-control bg-[var(--haze)]">
                        {listing.media?.[0] ? (
                          <Image
                            src={listing.media[0]}
                            alt={`${listing.title}${area ? `, ${area}` : ""}`}
                            fill
                            loading="lazy"
                            sizes="(min-width: 900px) 33vw, 80vw"
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center">
                            <Icon size={40} strokeWidth={1.5} className="t-3" aria-hidden="true" />
                          </span>
                        )}
                      </span>
                      <span className="mt-3 block">
                        <span className={`t-1 block break-words font-semibold ${i === 0 ? "text-h3" : "text-lead"}`}>
                          {listing.title}
                        </span>
                        <span className="t-2 mt-1 flex flex-wrap items-center gap-x-2 text-[15px]">
                          {area && (
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <MapPin size={14} strokeWidth={1.5} className="shrink-0" aria-hidden="true" />
                              <span className="truncate">{area}</span>
                            </span>
                          )}
                          {area && price && <span aria-hidden="true">,</span>}
                          {price ? (
                            <span>
                              from <Price amount={price.amount} unit={price.unit} />
                            </span>
                          ) : (
                            <span>Price on request</span>
                          )}
                        </span>
                        <span className="t-3 mt-1.5 inline-flex items-center gap-1.5 text-small">
                          <BadgeCheck size={14} strokeWidth={1.5} aria-hidden="true" />
                          Reviewed
                        </span>
                      </span>
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && listings.length > 0 && (
          <div className="mt-10">
            <Link
              href={exploreHref}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, exploreHref)}
              className="link inline-block py-2 font-medium"
            >
              {exploreLabel}
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}

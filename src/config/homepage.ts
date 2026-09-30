import { Cake, Star, Mic2, Gamepad2, Home, ShieldCheck, Zap, Users, Wallet, MapPin, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BRAND } from "@/config/brand";

export interface Cta {
  label: string;
  href: string;
}

export interface HeroImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export interface HeroConfig {
  badge: string;
  titleLead: string;
  titleAccent: string;
  titleAccentNote: string;
  subtitle: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  images: {
    background: HeroImage;
    floating: string[];
  };
}

export interface NavLink {
  label: string;
  href: string;
}

export interface QuickDiscoveryItem {
  key: string;
  label: string;
  title: string;
  image: string;
  href: string;
  cta: string;
}

export interface ActivityItem {
  label: string;
  href: string;
}

export interface CategoryItem {
  key: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  href: string;
}

export interface BookingModel {
  key: string;
  title: string;
  desc: string;
  href: string;
}

export interface IconBlock {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface GroupBookingStep {
  icon: LucideIcon;
  title: string;
  desc: string;
}

export interface GroupBookingConfig {
  badge: string;
  title: string;
  subtitle: string;
  steps: GroupBookingStep[];
  cta: Cta;
}

export interface LocationItem {
  name: string;
  area: string;
  query: string;
}

export interface BookingTypeColumn {
  key: string;
  label: string;
  icon: string;
  tagline: string;
  href: string;
  cta: string;
}

export interface BookingTypeRow {
  label: string;
  capacity: string;
  exclusive: string;
}

export interface BookingTypesConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  columns: BookingTypeColumn[];
  rows: BookingTypeRow[];
}

export interface RoleSide {
  label: string;
  icon: string;
  desc: string;
  features: string[];
}

export interface RolesConfig {
  eyebrow: string;
  title: string;
  subtitle: string;
  guest: RoleSide;
  host: RoleSide;
  footnote: string;
}

export interface HostPerk {
  title: string;
  desc: string;
}

export interface HostCtaConfig {
  title: string;
  subtitle: string;
  primaryCta: Cta;
  secondaryCta: Cta;
  perks: HostPerk[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export const SITE: { name: string; tagline: string; baseUrl: string } = {
  name: BRAND.name,
  tagline: BRAND.subtitle,
  baseUrl: process.env.CLOCKHOST_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
};

export const HERO: HeroConfig = {
  badge: "Real spaces trusted bookings",
  titleLead: "Find a place that",
  titleAccent: "fits your plans.",
  titleAccentNote: "fits your plans.",
  subtitle: "Discover trusted venues and shortlet apartments check availability compare what each place offers and book with confidence.",
  primaryCta: { label: "Browse spaces", href: "/listings" },
  secondaryCta: { label: "List your space", href: "/sign-up" },
  images: {
    background: {
      src: "https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=1920",
      alt: "Joyful friends celebrating in a Nigerian venue real people real moments",
      width: 1920,
      height: 1280,
    },
    floating: [
      "https://images.pexels.com/photos/3171837/pexels-photo-3171837.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600",
      "https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=600",
    ],
  },
};

// §67 Navigation ClockHost Explore Venues Shortlets How it works Become a Host Sign in
export const NAV_LINKS: NavLink[] = [
  { label: "Venues", href: "/listings?vertical=venue" },
  { label: "Shortlet Apartments", href: "/listings?vertical=housing" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Become a Host", href: "/sign-up" },
];

// §17 Quick Discovery — Venues lounge + Shortlets apartment
export const QUICK_DISCOVERY: QuickDiscoveryItem[] = [
  {
    key: "venues",
    label: "Venues",
    title: "Find places to relax, meet friends, celebrate, or enjoy an activity.",
    image: "https://images.pexels.com/photos/2603464/pexels-photo-2603464.jpeg?auto=format&fit=crop&w=800&q=80",
    href: "/listings?vertical=venue",
    cta: "Explore Venues",
  },
  {
    key: "shortlets",
    label: "Shortlet Apartments",
    title: "Find furnished apartments and short stays for your next trip, visit or temporary stay.",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
    href: "/listings?vertical=housing",
    cta: "Explore Shortlets",
  },
];

// §19 Activity discovery intents not business types
export const ACTIVITIES: ActivityItem[] = [
  { label: "Birthday", href: "/listings?subVertical=birthday" },
  { label: "Hangout", href: "/listings?subVertical=hangout" },
  { label: "Relaxation", href: "/listings?subVertical=relaxation" },
  { label: "Karaoke", href: "/listings?subVertical=karaoke" },
  { label: "Games", href: "/listings?subVertical=games" },
  { label: "Celebration", href: "/listings?subVertical=celebration" },
  { label: "Recreation", href: "/listings?subVertical=recreation" },
];

// Legacy CATEGORIES kept for backward compat during transition will be removed after §46 cleanup
export const CATEGORIES: CategoryItem[] = [
  { key: "birthday", icon: Cake, label: "Birthday", desc: "Party venues with decor and fun", href: "/listings?vertical=venue&subVertical=birthday" },
  { key: "exclusive_space", icon: Star, label: "Exclusive Space", desc: "Private halls and VIP rooms", href: "/listings?vertical=venue&subVertical=exclusive_space" },
  { key: "karaoke", icon: Mic2, label: "Karaoke", desc: "Pro sound systems, sing your heart out", href: "/listings?vertical=venue&subVertical=karaoke" },
  { key: "group_night", icon: Gamepad2, label: "Group Night", desc: "Pool, games, bar and group fun", href: "/listings?vertical=venue&subVertical=group_night" },
  { key: "housing", icon: Home, label: "Housing & Shortlets", desc: "Apartments and short-term rentals", href: "/listings?vertical=housing" },
];

// §23 Book by capacity / Book the whole space (was Shared seat/happening)
export const BOOKING_MODELS: BookingModel[] = [
  {
    key: "capacity",
    title: "Book by capacity",
    desc: "Reserve space for yourself or your group while the venue remains open to others. Pay per person and secure your spot instantly.",
    href: "/listings?bookingType=capacity",
  },
  {
    key: "exclusive",
    title: "Book the whole space",
    desc: "Reserve an eligible space exclusively for a defined period. Perfect for private events and gatherings.",
    href: "/listings?bookingType=exclusive",
  },
];

export const HOW_IT_WORKS: IconBlock[] = [
  {
    icon: MapPin,
    title: "Discover a space",
    desc: "Browse trusted venues and apartments with clear photos, pricing and availability all reviewed before going live.",
  },
  {
    icon: CheckCircle2,
    title: "Check availability & book",
    desc: "Book by capacity for shared experiences or book the whole space for private use. Pay securely through Paystack.",
  },
  {
    icon: Zap,
    title: "Show up and enjoy",
    desc: "Your booking record and receipt arrive right away. Check in with your host and enjoy your time.",
  },
];

// §24 Correct model: One owner pays, shares with invited, owner responsible not everyone pays their share
export const GROUP_BOOKING: GroupBookingConfig = {
  badge: "Group booking",
  title: "Book together, share the moment",
  subtitle:
    "One owner pays and shares the booking with invited people. Perfect for birthdays, hangouts and group nights no split payments, just one responsible booking.",
  steps: [
    {
      icon: Users,
      title: "Owner creates the booking",
      desc: "Choose a venue, date and headcount. The owner pays and becomes responsible for the reservation.",
    },
    {
      icon: Wallet,
      title: "Share with your group",
      desc: "Send the booking details to friends on WhatsApp or anywhere. Everyone knows where to be.",
    },
    {
      icon: CheckCircle2,
      title: "Check in together",
      desc: "Show your booking record at the venue. The host verifies the owner and welcomes your group.",
    },
  ],
  cta: { label: "Find a group-friendly venue", href: "/listings?vertical=venue" },
};

// §25 Know what you're booking Reviewed/Clear terms/Secure payments/Real records (not identity/escrow/insurance unless proven)
export const WHY_CLOCKHOST: IconBlock[] = [
  {
    icon: ShieldCheck,
    title: "Reviewed listings",
    desc: `Every listing is reviewed by the ${BRAND.name} team before it goes live, so you see accurate photos and terms.`,
  },
  {
    icon: Zap,
    title: "Clear booking terms",
    desc: "Availability, capacity, time and cancellation terms are shown before you pay no surprises.",
  },
  {
    icon: Wallet,
    title: "Secure payments",
    desc: "Pay in Naira through Paystack with a real booking record and receipt you can show at the venue.",
  },
  {
    icon: Users,
    title: "Real booking records",
    desc: "Guest reviews are tied to completed bookings, so what you read comes from real visits.",
  },
];

export const LOCATIONS: LocationItem[] = [
  { name: "Ilorin", area: "Kwara State", query: "Ilorin" },
  { name: "Lagos", area: "Lagos State", query: "Lagos" },
  { name: "Abuja", area: "FCT", query: "Abuja" },
  { name: "Ibadan", area: "Oyo State", query: "Ibadan" },
  { name: "Port Harcourt", area: "Rivers State", query: "Port Harcourt" },
  { name: "Kaduna", area: "Kaduna State", query: "Kaduna" },
  { name: "Enugu", area: "Enugu State", query: "Enugu" },
  { name: "Kano", area: "Kano State", query: "Kano" },
];

// §27 Fabricated testimonials removed render only if real eligible reviews exist, else hide section
export const TESTIMONIALS: Record<string, unknown>[] = [];

export const BOOKING_TYPES: BookingTypesConfig = {
  eyebrow: "How booking works",
  title: "Book by capacity or book the whole space",
  subtitle:
    `Every space on ${BRAND.name} uses one of two clear booking models. Choose what fits your plans.`,
  columns: [
    {
      key: "capacity",
      label: "Book by capacity",
      icon: "seats",
      tagline: "Reserve space for yourself/group while the venue remains open to others.",
      href: "/listings?bookingType=capacity",
      cta: "Browse capacity spaces",
    },
    {
      key: "exclusive",
      label: "Book the whole space",
      icon: "lock",
      tagline: "Reserve an eligible space exclusively for a defined period.",
      href: "/listings?bookingType=exclusive",
      cta: "Browse exclusive spaces",
    },
  ],
  rows: [
    {
      label: "How it works",
      capacity: "Reserve space for yourself or your group while the venue remains open to others.",
      exclusive: "Reserve an eligible space exclusively for a defined period.",
    },
    {
      label: "Payment",
      capacity: "Pay per person in Naira with a short hold. Owner pays and shares with invited people.",
      exclusive: "Pay the period rate to secure the whole space. First payment wins.",
    },
    {
      label: "Confirmation",
      capacity: "Host approves, then you pay. Auto-confirms when payment clears.",
      exclusive: "Host approves exclusive requests before payment.",
    },
    {
      label: "Best for",
      capacity: "Relaxing, hangouts, karaoke, games with friends.",
      exclusive: "Birthdays, celebrations, private gatherings.",
    },
  ],
};

export const ROLES: RolesConfig = {
  eyebrow: "One account, multiple roles",
  title: "Book spaces or list your own",
  subtitle:
    `Your ${BRAND.name} account works for both sides of the market. Sign up as a guest to book, or as a host to list your space.`,
  guest: {
    label: "Book as a guest",
    icon: "search",
    desc: "Discover spaces, compare prices and book instantly with no listing duties.",
    features: [
      "Browse venues and shortlets",
      "Reserve instantly or request exclusive spaces",
      "Split costs with friends on group booking",
    ],
  },
  host: {
    label: "Earn as a host",
    icon: "store",
    desc: "Turn your venue, apartment or kitchen into a paying listing in minutes.",
    features: [
      "Create listings with photos and pricing",
      "Manage slots, availability and add-ons",
      "Get paid securely through Paystack",
    ],
  },
  footnote:
    "Sign up once, then add the host side to your account from your profile. Your active role simply decides which dashboard you land on first.",
};

// §68 Have a space people would love? Venue Host 1 listing, Shortlet multiple, no kitchen, no unlimited
export const HOST_CTA: HostCtaConfig = {
  title: `Have a space people would love?`,
  subtitle:
    "Become a Venue Host with one listing, or a Shortlet Host with multiple apartments. Reach guests in Ilorin and get paid securely through Paystack. See how hosting works.",
  primaryCta: { label: "Become a Host", href: "/sign-up" },
  secondaryCta: { label: "See how hosting works", href: "/listings" },
  perks: [
    { title: "Venue Host one listing", desc: "Manage one venue or outdoor space with clear availability and pricing." },
    { title: "Shortlet Host multiple", desc: "List several apartments with monthly pricing and viewings." },
    { title: "Reviewed before live", desc: "Every space is checked before guests can book." },
    { title: "Secure payments", desc: "Bookings create real records you can verify at check-in." },
  ],
};

export const FAQS: FaqItem[] = [
  {
    q: `What is ${BRAND.name}?`,
    a: `${BRAND.name} is Nigeria's marketplace for discovering and booking unique spaces. From lively karaoke bars and elegant event centers to shortlet apartments, we connect you with the perfect space for every occasion.`,
  },
  {
    q: "How do I book a space?",
    a: "Browse listings, find a space you like, select your date and time and complete your booking. Capacity bookings let you reserve a slot instantly. Exclusive spaces require a request, then the host confirms availability and you pay to secure it.",
  },
  {
    q: "What is group booking?",
    a: `Group booking lets you split the cost of a venue with friends. One person starts the plan and shares the link. Each friend joins with their ${BRAND.name} account and pays their own share in Naira. The plan auto-confirms once the group fills up, or cancels with refunds if it does not by the close date. A free account is needed to start or join.`,
  },
  {
    q: "What types of spaces are available?",
    a: "We offer two categories: Venues (karaoke bars, event centers, party halls and exclusive spaces) and Housing (shortlets and apartments). Each listing clearly shows its category, pricing and available add-ons.",
  },
  {
    q: "How do payments work?",
    a: "All payments are processed securely through Paystack, Nigeria's PCI-compliant gateway. You can pay via debit card, USSD, bank transfer or QR code. Funds are only charged once the booking is confirmed.",
  },
  {
    q: "Can I list my own space?",
    a: "Yes! Sign up as a host, create a listing with photos, pricing and availability rules, then submit for admin review. Once approved, your space goes live for guests to discover and book.",
  },
  {
    q: "Can I be both a host and a guest?",
    a: `Yes. One ${BRAND.name} account supports both sides. Sign up as a guest to book spaces first, then add the host side from your profile to start listing your own space. You can switch between them anytime.`,
  },
  {
    q: "What is the difference between capacity and exclusive booking?",
    a: "Capacity booking works like event tickets. You reserve a spot in a shared experience, like a karaoke session. Exclusive booking gives you full private access to a space for a specific time window, like renting an entire event center.",
  },
  {
    q: `Is ${BRAND.name} available outside Ilorin?`,
    a: "We currently operate in Ilorin, Kwara State. Expansion to other Nigerian cities is on the roadmap. Follow us for announcements about new locations.",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "Each listing clearly shows its cancellation policy (flexible, moderate or strict) before you book. Refunds are processed according to that policy. Contact the host directly for special circumstances or disputes.",
  },
];

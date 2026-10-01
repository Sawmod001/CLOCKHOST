import { BadgeCheck, FileText, CreditCard, ReceiptText } from "lucide-react";

const ITEMS = [
  {
    icon: BadgeCheck,
    title: "Reviewed listings",
    body: "Our team reviews every listing before it goes live, so photos and terms match the real space.",
  },
  {
    icon: FileText,
    title: "Clear booking terms",
    body: "Availability, capacity, timing and cancellation terms are shown before you pay. No surprises.",
  },
  {
    icon: CreditCard,
    title: "Secure payments",
    body: "Pay in naira through Paystack and get a booking record and receipt to show at the venue.",
  },
  {
    icon: ReceiptText,
    title: "Real booking records",
    body: "Reviews come only from completed bookings, so what you read is from real visits.",
  },
];

/**
 * WhyClockHost (Trust) — docs/02 (Trust) + docs/03 + docs/06 Prompt 7.
 * Haze with grain. 2 x 2 hairline grid, 24px Lucide icons, no icon boxes,
 * no card backgrounds. Server component: no motion, no JS.
 */
export default function WhyClockHost() {
  return (
    <section aria-labelledby="trust-title" className="surface-haze surface-grain">
      <div className="page section">
        <div className="section-head">
          <h2 id="trust-title" className="section-title t-1 text-h2">
            Know what you&apos;re booking
          </h2>
          <p className="section-sub t-2">
            Reviewed listings, clear terms, secure payments and real records
            from completed bookings.
          </p>
        </div>

        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2">
          {ITEMS.map((item) => (
            <li
              key={item.title}
              className="border-t pt-6"
              style={{ borderColor: "var(--line)" }}
            >
              <item.icon size={24} strokeWidth={1.5} className="t-1" aria-hidden="true" />
              <h3 className="t-1 mt-4 text-h3 font-semibold">{item.title}</h3>
              <p className="section-sub t-2 mt-2">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

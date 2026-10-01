import Script from "next/script";

interface FaqEntry {
  q: string;
  a: string;
}

// Answers rewritten for clarity (60 words max each) keeping every answer's
// substance, per docs/03-COPY.md (FAQ). Q8 uses the star-section labels,
// not backend terms.
const FAQS: FaqEntry[] = [
  {
    q: "What is ClockHost?",
    a: "ClockHost is a marketplace for discovering and booking venues and shortlet apartments. Browse real spaces with clear photos, pricing and availability, and book securely in naira.",
  },
  {
    q: "How do I book a space?",
    a: "Find a space you like, pick a date and time, and pay. Shared experiences confirm once you pay. Whole spaces need the host's approval first, then you pay to secure them.",
  },
  {
    q: "What is group booking?",
    a: "One person pays for the booking and shares it with invited guests. There is nothing to split and nothing to chase. The plan confirms once the group is complete.",
  },
  {
    q: "What types of spaces are available?",
    a: "Venues for gatherings and celebrations, and furnished shortlets for stays. Every listing shows its type, pricing and availability up front.",
  },
  {
    q: "How do payments work?",
    a: "Every payment goes through Paystack in naira: cards, USSD, bank transfer or QR. Money moves only on confirmed bookings, and every booking carries a receipt.",
  },
  {
    q: "Can I list my own space?",
    a: "Sign up as a host, add photos, pricing and availability, then submit for review. Your space goes live once approved.",
  },
  {
    q: "Can I be both a host and a guest?",
    a: "Yes. One account books and lists. Start as a guest, add hosting anytime, and switch sides whenever you like.",
  },
  {
    q: "What is the difference between booking a spot and booking the whole space?",
    a: "A spot reserves your place in a shared experience, like karaoke night. The whole space reserves it privately for your period, like an entire hall for a birthday.",
  },
  {
    q: "Is ClockHost available outside Ilorin?",
    a: "Not yet. We operate in Ilorin, Kwara State, and more Nigerian cities are on the way.",
  },
  {
    q: "What if I need to cancel a booking?",
    a: "Every listing shows its cancellation terms before you pay: flexible, moderate or strict. Refunds follow those terms.",
  },
];

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: { "@type": "Answer", text: faq.a },
  })),
};

/**
 * Faq — docs/02 (FAQ) + docs/03 + docs/06 Prompt 9.
 * Haze with grain, sticky heading, exclusive <details name="faq">
 * accordion, hairlines, CSS plus mark. No JS. JSON-LD kept for SEO.
 */
export default function Faq() {
  return (
    <section aria-labelledby="faq-title" className="surface-haze surface-grain">
      <div className="page section">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-24">
              <h2 id="faq-title" className="section-title t-1 text-h2">
                Questions before you book
              </h2>
            </div>
          </div>
          <div className="lg:col-span-8">
            {FAQS.map((faq) => (
              <details key={faq.q} name="faq" className="faq-item group border-t py-5 last:border-b" style={{ borderColor: "var(--line)" }}>
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                  <span className="t-1 font-semibold leading-snug">{faq.q}</span>
                  <span className="faq-plus t-1 shrink-0" aria-hidden="true" />
                </summary>
                <p className="section-sub t-2 mt-3 max-w-[60ch]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <Script id="faq-schema" type="application/ld+json" strategy="lazyOnload">
        {JSON.stringify(FAQ_SCHEMA)}
      </Script>
    </section>
  );
}

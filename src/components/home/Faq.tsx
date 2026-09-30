"use client";

import { useState } from "react";
import Script from "next/script";
import { ChevronDown, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SectionContainer, SectionHeading } from "./Section";
import Reveal from "./Reveal";
import { FAQS } from "@/config/homepage";

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

export default function Faq() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <section className="border-t border-[var(--color-night-border-soft)] bg-[var(--color-night)]">
      <SectionContainer className="py-16 sm:py-24" id="faq">
        <SectionHeading
          eyebrow="Support"
          title="Frequently asked questions"
          subtitle="Everything you need to know before booking your next place."
        />

        <div className="mx-auto max-w-3xl space-y-3">
          {FAQS.map((faq, i: number) => {
            const isOpen = openFaq === i;
            return (
              <Reveal key={i} delay={(i % 2) * 40} className="h-full">
                <motion.div
                  className={`overflow-hidden rounded-2xl border bg-[var(--color-night-card)] transition-colors duration-200 ${
                    isOpen ? "border-[var(--color-flame-bright)]/40 shadow-lg shadow-black/10" : "border-[var(--color-night-border)] hover:border-white/10"
                  }`}
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-tab-${i}`}
                    className="flex min-h-[44px] w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex ${isOpen ? "bg-[var(--color-flame)] text-white" : "bg-white/5 text-[var(--color-night-muted)]"}`}>
                        <HelpCircle size={14} aria-hidden="true" />
                      </span>
                      <span className="min-w-0 break-words text-[15px] font-semibold leading-snug text-[var(--color-night-text)]">
                        {faq.q}
                      </span>
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 180 : 0, backgroundColor: isOpen ? "rgba(232,74,42,0.15)" : "rgba(255,255,255,0.05)" }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    >
                      <ChevronDown
                        size={16}
                        style={{ color: "var(--color-flame-bright)" }}
                        aria-hidden="true"
                      />
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-tab-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.32, ease: [0.21, 0.47, 0.32, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-[var(--color-night-border-soft)] px-5 pb-5 pt-4 sm:px-6">
                          <p className="text-sm leading-relaxed text-[var(--color-night-muted)]">{faq.a}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Reveal>
            );
          })}
        </div>
      </SectionContainer>

      <Script id="faq-schema" type="application/ld+json" strategy="lazyOnload">
        {JSON.stringify(FAQ_SCHEMA)}
      </Script>
    </section>
  );
}

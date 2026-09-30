"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { SectionContainer } from "./Section";
import Reveal from "./Reveal";
import { HOW_IT_WORKS, GROUP_BOOKING } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HowItWorksProps {
  gate: GateHandler;
}

export default function HowItWorks({ gate }: HowItWorksProps) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-night)] py-16 sm:py-24">
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-20 -right-20 h-[420px] w-[420px] rounded-full bg-[var(--color-flame-soft)] blur-[80px]" />
      </div>

      <SectionContainer className="relative">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative lg:sticky lg:top-24">
            <Reveal>
              <div className="flex gap-4">
                <span className="hidden select-none text-[72px] font-bold leading-none text-white/[0.06] sm:block" style={{ fontFamily: "var(--font-instrument-serif), serif" }}>
                  01
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--color-gold)]" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                    How it works
                  </p>
                  <h2 className="mt-2 font-bold leading-[0.95] tracking-tight text-[var(--color-night-text)]" style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "clamp(28px, 4vw, 40px)" }}>
                    Book a space
                    <span className="block font-normal italic" style={{ fontFamily: "var(--font-instrument-serif), serif" }}>
                      in three steps
                    </span>
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--color-night-muted)]">
                    Search, reserve and go. No phone calls, no guesswork. Every step is verified.
                  </p>
                </div>
              </div>
            </Reveal>

            <div className="absolute -left-8 top-1/2 hidden -translate-y-1/2 -rotate-90 lg:block" aria-hidden="true">
              <span className="text-[11px] font-bold tracking-[0.2em] text-white/20" style={{ fontFamily: "var(--font-space-grotesk), sans-serif" }}>
                CLOCKHOST HOW IT WORKS
              </span>
            </div>

            <motion.div
              className="mt-8 hidden overflow-hidden rounded-2xl lg:block"
              style={{ aspectRatio: "4/3" }}
              initial={{ clipPath: "inset(0 100% 0 0)" }}
              whileInView={{ clipPath: "inset(0 0% 0 0)" }}
              viewport={{ once: true }}
              transition={{ duration: 1.0, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <img
                src="https://images.pexels.com/photos/2603464/pexels-photo-2603464.jpeg?auto=format&fit=crop&w=800&q=80"
                alt="Lounge interior"
                className="h-full w-full object-cover object-center"
                loading="lazy"
              />
            </motion.div>
          </div>

          <ol className="space-y-8">
            {HOW_IT_WORKS.map((step, i: number) => {
              const Icon = step.icon;
              const num = String(i + 1).padStart(2, "0");
              return (
                <motion.li
                  key={step.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="group relative flex gap-5 rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-6 transition-all hover:-translate-y-1 hover:shadow-md"
                >
                  <span className="shrink-0 font-bold leading-none text-[var(--color-flame)]/20" style={{ fontFamily: "var(--font-instrument-serif), serif", fontSize: "42px" }}>
                    {num}
                  </span>
                  <div className="min-w-0 pt-1">
                    <h3 className="flex items-center gap-2 font-semibold text-[var(--color-night-text)]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
                      <Icon size={16} className="text-[var(--color-flame-bright)]" aria-hidden="true" />
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-[var(--color-night-muted)]">{step.desc}</p>
                  </div>
                  <span className="absolute bottom-0 left-6 right-6 h-px origin-left scale-x-0 bg-[var(--color-flame)]/20 transition-transform duration-300 group-hover:scale-x-100" aria-hidden="true" />
                </motion.li>
              );
            })}
          </ol>
        </div>

        <motion.div
          className="mt-12 overflow-hidden rounded-[20px] border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-6 sm:p-7"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-flame)]/15 text-[var(--color-flame-bright)] sm:flex">
                <span className="text-sm font-bold">G</span>
              </div>
              <div>
                <p className="font-semibold text-[var(--color-night-text)]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
                  {GROUP_BOOKING.title}
                </p>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--color-night-muted)]">{GROUP_BOOKING.subtitle}</p>
              </div>
            </div>
            <Link
              href={GROUP_BOOKING.cta.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, GROUP_BOOKING.cta.href)}
              className="group inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--color-flame)] px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-[var(--color-flame-bright)] sm:w-auto"
            >
              {GROUP_BOOKING.cta.label} <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </motion.div>
      </SectionContainer>
    </section>
  );
}

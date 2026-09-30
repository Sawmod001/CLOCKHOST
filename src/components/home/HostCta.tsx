import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import Reveal from "./Reveal";
import { HOST_CTA } from "@/config/homepage";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HostCtaProps {
  gate: GateHandler;
}

export default function HostCta({ gate }: HostCtaProps) {
  return (
    <section className="relative overflow-hidden bg-[var(--color-night)]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_60%_90%_at_10%_0%,rgba(232,119,79,0.18)_0%,transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_100%_100%,rgba(217,168,102,0.14)_0%,transparent_55%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <Reveal>
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-gold)]/30 bg-[var(--color-gold)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-gold)]">
                <Building2 size={14} aria-hidden="true" /> For space owners
              </span>
              <h2 className="font-serif-display mt-5 text-3xl font-semibold leading-tight text-[var(--color-night-text)] sm:text-4xl">
                {HOST_CTA.title}
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--color-night-muted)] sm:text-base">
                {HOST_CTA.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={HOST_CTA.primaryCta.href}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, HOST_CTA.primaryCta.href)}
                  className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-flame)] px-7 py-3.5 font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--color-flame-bright)] sm:w-auto"
                >
                  {HOST_CTA.primaryCta.label} <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link
                  href={HOST_CTA.secondaryCta.href}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, HOST_CTA.secondaryCta.href)}
                  className="btn-outline-night inline-flex min-h-[44px] w-full items-center justify-center px-7 py-3.5 sm:w-auto"
                >
                  {HOST_CTA.secondaryCta.label}
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
              {HOST_CTA.perks.map((perk, i: number) => (
                <Reveal key={perk.title} delay={i * 80} className="h-full">
                  <div className="h-full rounded-2xl border border-[var(--color-night-border)] bg-[var(--color-night-card)] p-5">
                    <p className="text-sm font-semibold text-[var(--color-night-text)]">{perk.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[var(--color-night-muted)]">{perk.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

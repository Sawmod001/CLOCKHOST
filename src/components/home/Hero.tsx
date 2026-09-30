"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { HERO } from "@/config/homepage";
import { SectionContainer } from "./Section";

export type GateHandler = (e: React.MouseEvent, href: string) => void;

interface HeroProps {
  gate: GateHandler;
}

export default function Hero({ gate }: HeroProps) {
  const bg = HERO.images.background;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yParallax = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative overflow-hidden bg-[var(--color-night)]">
      {/* Editorial motion background morphing 3D gradients + 360 rotation */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={bg.src}
          alt=""
          width={bg.width}
          height={bg.height}
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[center_30%] opacity-[0.32]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,18,15,0.55)_0%,rgba(10,18,15,0.88)_68%,rgba(10,18,15,0.98)_100%)]" />
        {/* Morph gradient orbs customizable 3D */}
        <motion.div
          className="morph-blob absolute -top-28 -left-20 h-[560px] w-[560px] blur-[85px]"
          style={{ background: "radial-gradient(circle, rgba(232,74,42,0.20) 0%, transparent 70%)" }}
          animate={{ x: [0, 28, -18, 0], y: [0, -18, 28, 0], rotate: [0, 5, -5, 0], scale: [1, 1.04, 0.99, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="morph-blob absolute -bottom-24 -right-20 h-[620px] w-[620px] blur-[90px]"
          style={{ background: "radial-gradient(circle, rgba(232,184,109,0.13) 0%, transparent 70%)" }}
          animate={{ x: [0, -22, 14, 0], y: [0, 18, -14, 0], rotate: [0, -4, 4, 0], scale: [1, 1.03, 0.98, 1] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
        />
        <motion.div
          className="morph-blob absolute top-[42%] left-1/2 h-[460px] w-[460px] -translate-x-1/2 -translate-y-1/2 blur-[75px]"
          style={{ background: "radial-gradient(circle, rgba(20,80,60,0.10) 0%, transparent 70%)" }}
          animate={{ scale: [1, 1.07, 1], opacity: [0.5, 0.85, 0.5], rotate: [0, 180, 360] }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />
        {/* 360 rotating border */}
        <motion.div
          className="absolute top-1/2 left-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]"
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        />
      </div>

      <SectionContainer className="relative flex min-h-[82svh] flex-col justify-center py-16 sm:py-20 lg:min-h-[78svh] lg:py-12">
        <motion.div
          style={{ y: yParallax, opacity }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="mx-auto max-w-3xl text-center"
        >
          <h1 className="font-bold leading-[0.92] tracking-tight text-white" style={{ fontFamily: "var(--font-manrope), var(--font-geist-sans), sans-serif" }}>
            <span className="block text-[36px] sm:text-[52px] lg:text-[64px]">Find a place that</span>
            <span className="block font-normal italic tracking-tight" style={{ fontFamily: "var(--font-instrument-serif), var(--font-fraunces), serif", fontSize: "clamp(36px, 6vw, 64px)" }}>
              fits your plans.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 sm:text-[17px]" style={{ fontFamily: "var(--font-manrope), sans-serif" }}>
            {HERO.subtitle}
          </p>

          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={HERO.primaryCta.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, HERO.primaryCta.href)}
              className="group inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full bg-[var(--color-flame)] px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-all hover:-translate-y-0.5 hover:bg-[var(--color-flame-bright)] hover:shadow-xl sm:w-auto"
            >
              {HERO.primaryCta.label}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link
              href={HERO.secondaryCta.href}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => gate(e, HERO.secondaryCta.href)}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10 sm:w-auto"
            >
              Become a Host
            </Link>
          </div>
        </motion.div>
      </SectionContainer>
    </section>
  );
}

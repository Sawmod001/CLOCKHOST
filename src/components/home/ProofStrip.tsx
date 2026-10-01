"use client";

import Image from "next/image";
import { motion, useReducedMotion, MotionConfig } from "framer-motion";
import { BadgeCheck, Banknote, ReceiptText } from "lucide-react";

/**
 * ProofStrip — horizontal proof marquee (owner decision, overrides the
 * no-infinite-animation rule for this strip only).
 * Three true statements ride a slow loop in and out; static when the user
 * prefers reduced motion. The official Paystack mark keeps its proportions.
 */
const ITEMS = [
  { icon: BadgeCheck, label: "Venues and Shortlet apartments reviewed before going live", mark: false },
  { icon: Banknote, label: "Pay in naira with", mark: true },
  { icon: ReceiptText, label: "A receipt for every booking", mark: false },
];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <div className="proof-track" aria-hidden={hidden || undefined}>
      {ITEMS.map((item) => (
        <span key={item.label} className="flex items-center gap-3 whitespace-nowrap">
          <item.icon
            size={20}
            strokeWidth={1.5}
            className="t-1 h-5 w-5 shrink-0"
            aria-hidden="true"
          />
          <span className="font-label-face t-1 text-[15px]">{item.label}</span>
          {item.mark && (
            <Image
              src="/icons/paystack-mark.png"
              alt="Paystack"
              width={568}
              height={101}
              className="h-5 w-auto shrink-0"
            />
          )}
        </span>
      ))}
    </div>
  );
}

export default function ProofStrip() {
  const reduceMotion = useReducedMotion();

  return (
    <MotionConfig reducedMotion="user">
      <section aria-labelledby="proof-title" className="surface-paper overflow-hidden">
        <div
          className="page"
          style={{ borderBlockStart: "1px solid var(--line)", borderBlockEnd: "1px solid var(--line)" }}
        >
          <h2 id="proof-title" className="sr-only">
            Our promises
          </h2>
          {reduceMotion ? (
            <ul className="flex flex-col gap-4 py-6">
              {ITEMS.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <item.icon
                    size={20}
                    strokeWidth={1.5}
                    className="t-1 h-5 w-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="font-label-face t-1 text-[15px]">{item.label}</span>
                  {item.mark && (
                    <Image
                      src="/icons/paystack-mark.png"
                      alt="Paystack"
                      width={568}
                      height={101}
                      className="h-5 w-auto shrink-0"
                    />
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex overflow-hidden py-5">
              <motion.div
                className="flex"
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 26, ease: "linear", repeat: Infinity }}
              >
                <Row />
                <Row hidden />
              </motion.div>
            </div>
          )}
        </div>
      </section>
    </MotionConfig>
  );
}

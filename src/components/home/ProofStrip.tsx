import Image from "next/image";
import { BadgeCheck, ReceiptText } from "lucide-react";

/**
 * ProofStrip — docs/02 (Proof strip) + docs/03 (Proof rules).
 * Server component. Three true statements, hairlines, no boxes.
 */
const ITEMS = [
  { icon: BadgeCheck, label: "Venues and Shortlet apartments reviewed before going live" },
  { icon: null, label: "Pay in naira with Paystack", mark: true },
  { icon: ReceiptText, label: "A receipt for every booking" },
];

export default function ProofStrip() {
  return (
    <section aria-labelledby="proof-title" className="surface-paper">
      <div
        className="page"
        style={{ borderBlockStart: "1px solid var(--line)", borderBlockEnd: "1px solid var(--line)" }}
      >
        <div className="flex flex-col gap-4 py-6">
          <h2 id="proof-title" className="sr-only">
            Our promises
          </h2>
          <ul className="grid flex-1 gap-3 sm:grid-cols-3 sm:gap-6">
          {ITEMS.map((item) => (
            <li key={item.label} className="flex min-h-[44px] items-center gap-2.5">
              {item.mark ? (
                <Image
                  src="/icons/paystack-mark.png"
                  alt="Paystack"
                  width={568}
                  height={101}
                  className="h-4 w-auto shrink-0"
                />
              ) : (
                item.icon && (
                  <item.icon size={20} strokeWidth={1.5} className="t-1 shrink-0" aria-hidden="true" />
                )
              )}
              <span className="t-1 text-sm font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
        </div>
      </div>
    </section>
  );
}

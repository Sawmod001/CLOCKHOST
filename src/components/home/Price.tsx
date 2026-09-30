/**
 * Price — rebrand v2 (docs/07 section 2).
 * Renders ₦ in the text face and digits in Teko figures.
 * Use for every price on the homepage.
 */
export function Price({ amount, unit }: { amount: number; unit?: string }) {
  return (
    <span className="price">
      <span className="price__cur" aria-hidden="true">
        ₦
      </span>
      <span className="price__num">{new Intl.NumberFormat("en-NG").format(amount)}</span>
      {unit ? <span className="price__unit">{unit}</span> : null}
      <span className="sr-only"> naira</span>
    </span>
  );
}

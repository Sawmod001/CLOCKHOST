export type SeatMode = "capacity" | "exclusive" | "group";

interface Seat {
  x: number;
  y: number;
}

const XS = [24, 68, 112, 180, 224, 268];
const YS = [100, 158, 216];
const SEATS: Seat[] = YS.flatMap((y) => XS.map((x) => ({ x, y })));

const LABELS: Record<SeatMode, string> = {
  capacity: "Seat picker showing four seats chosen in a shared venue",
  exclusive: "Seat picker showing a whole venue reserved privately",
  group: "Seat picker showing six seats booked together, one paying",
};

const LEGENDS: Record<SeatMode, Array<{ swatch: string; text: string }>> = {
  capacity: [
    { swatch: "var(--mango)", text: "Your 4 seats" },
    { swatch: "rgb(255 255 255 / 0.5)", text: "Other guests" },
  ],
  exclusive: [{ swatch: "#ffffff", text: "The whole room is yours" }],
  group: [
    { swatch: "var(--mango)", text: "Your group" },
    { swatch: "transparent-ring", text: "Ring pays" },
  ],
};

const YOURS = "var(--mango)";
const OTHER = "rgb(255 255 255 / 0.5)";
const OUTLINE = "rgb(255 255 255 / 0.45)";

function seatStyle(mode: SeatMode, index: number): React.CSSProperties {
  const base: React.CSSProperties = {
    transition: "fill 0.3s ease, opacity 0.3s ease",
  };
  if (mode === "exclusive") {
    return { ...base, fill: "#ffffff", opacity: 1 };
  }
  if (mode === "group") {
    const group = [7, 8, 9, 13, 14, 15];
    if (group.includes(index)) return { ...base, fill: YOURS, opacity: 1 };
    return { ...base, fill: "none", stroke: OUTLINE, strokeWidth: 1.5, opacity: 1 };
  }
  // capacity
  if ([1, 4, 9, 14].includes(index)) return { ...base, fill: YOURS, opacity: 1 };
  if ([2, 3, 8, 10, 15, 16].includes(index)) return { ...base, fill: OTHER, opacity: 1 };
  return { ...base, fill: "none", stroke: OUTLINE, strokeWidth: 1.5, opacity: 1 };
}

/**
 * SeatMap — cinema-style seat picker for the star section.
 * Everyone has booked cinema seats: mango = chosen, white = taken,
 * outline = free, ring = who pays, lock = whole room. A live legend under
 * the map says what each mark means, so no state is ever a mystery.
 * 1.5px strokes, token colours only. State crossfades in 300ms.
 */
export default function SeatMap({ mode }: { mode: SeatMode }) {
  const payer = 7;
  const groupPeers = [8, 9, 13, 14, 15];
  const payerSeat = SEATS[payer]!;

  return (
    <figure className="w-full">
      <svg
        viewBox="0 0 320 330"
        role="img"
        aria-label={LABELS[mode]}
        data-mode={mode}
        className="h-auto w-full"
      >
        {/* stage */}
        <rect x="60" y="18" width="200" height="14" rx="7" fill={OUTLINE} opacity="0.8" />
        <text
          x="160"
          y="52"
          textAnchor="middle"
          fontSize="11"
          letterSpacing="3"
          fill={OUTLINE}
          style={{ fontFamily: "var(--font-body)", fontWeight: 500 }}
        >
          STAGE
        </text>

        {/* seats */}
        {SEATS.map((seat, i) => (
          <rect
            key={i}
            x={seat.x}
            y={seat.y}
            width="28"
            height="26"
            rx="9"
            style={seatStyle(mode, i)}
          />
        ))}

        {/* group links */}
        {mode === "group" &&
          groupPeers.map((i) => (
            <line
              key={i}
              x1={payerSeat.x + 14}
              y1={payerSeat.y + 13}
              x2={SEATS[i]!.x + 14}
              y2={SEATS[i]!.y + 13}
              stroke={YOURS}
              strokeWidth="1.5"
              opacity="0.7"
              style={{ transition: "opacity 0.3s ease" }}
            />
          ))}

        {/* ring: the person who pays */}
        {mode === "group" && (
          <rect
            x={payerSeat.x - 5}
            y={payerSeat.y - 5}
            width="38"
            height="36"
            rx="12"
            fill="none"
            stroke={YOURS}
            strokeWidth="1.5"
            style={{ transition: "opacity 0.3s ease" }}
          />
        )}

        {/* padlock: whole space */}
        {mode === "exclusive" && (
          <g
            stroke="#ffffff"
            strokeWidth="2.5"
            fill="none"
            style={{ transition: "opacity 0.3s ease" }}
          >
            <rect x="132" y="272" width="56" height="44" rx="8" fill="rgb(241 175 87 / 0.25)" />
            <path d="M144 272 v-10 a16 16 0 0 1 32 0 v10" />
          </g>
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {LEGENDS[mode].map((item) => (
          <span
            key={item.text}
            className="inline-flex items-center gap-2 text-[13px] font-medium"
            style={{ color: "rgb(255 255 255 / 0.8)" }}
          >
            {item.swatch === "transparent-ring" ? (
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-3.5 rounded-[5px] border-2"
                style={{ borderColor: YOURS }}
              />
            ) : (
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-3.5 rounded-[5px]"
                style={{ background: item.swatch }}
              />
            )}
            {item.text}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

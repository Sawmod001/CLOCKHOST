import { freeSlots, formatSlotTime } from "./bot";
import type { Listing, Slot, MatchEntry } from "./bot";

const DEFAULT_MODEL = "gemini-2.5-flash";
const GENERATE_URL = (model: string): string =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

const SYSTEM_PROMPT = `You are ClockHost, the WhatsApp assistant for ClockHost — a Nigerian marketplace for booking event venues and spaces. You are chatting with a customer on WhatsApp.

ABOUT CLOCKHOST:
- ClockHost is a Nigerian marketplace where hosts list venues and customers book them by the hour. Prices and payments are in Naira (NGN).
- Hosts manage their own listings, prices, and availability. Customers search by area (e.g. Ikeja, Lekki), compare, and book.
- Venue profiles are capacity (up to a max pax), timelot (a fixed event with timed slots), or exclusive/private.
- Group booking: one person creates a plan for a venue, shares a link, and each member pays their own share. The plan finalizes when the target group size is filled, and cancels with refunds if it does not fill by the close date.
- You may answer general questions about how ClockHost works, group bookings, payment, or refunds. For anything about a specific venue, use ONLY the venue data provided.

STRICT RULES:
- For venue questions, answer ONLY using the venue data provided in the message. Never invent venues, prices, areas, capacities, amenities, or available times.
- Prices are in Naira and already converted. Do not recalculate a rate unless the user asks for a total — then you may only multiply the given per-hour rate by the number of hours.
- If the data does not cover the question, say you don't have that info and suggest what they can ask (e.g. an area like Ikeja or Lekki, or reply "menu").
- WhatsApp style: plain text, short lines, 2-6 lines, no markdown, no tables, no headings. Use bullets (•) sparingly.
- Be warm and concise. If the user seems ready to book, tell them to reply with the number of the venue they want.
- If the user wants to browse, point them to the areas that currently have available venues.`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

interface CompactVenue {
  title: string | undefined;
  area: string;
  bookingType: string | undefined;
  pricePerHourNaira: number;
  maxCapacity: number | string | null;
  description: string;
  freeSlots: Array<{ start: string; remaining: number }>;
}

export async function generateReply({ text, venues }: { text: string; venues: MatchEntry[] }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const context = JSON.stringify((venues || []).map(compactVenue));
  const userPart = `User: ${String(text || "").slice(0, 500)}\n\nAvailable venues (JSON):\n${context}`;

  const res = await fetch(`${GENERATE_URL(model)}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: userPart }] }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error("Gemini API error:", res.status, errBody.slice(0, 300));
    throw new Error(`Gemini request failed (${res.status})`);
  }

  const data = (await res.json()) as GeminiResponse;
  const reply = (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();
  if (!reply) throw new Error("Gemini returned an empty reply");
  return reply;
}

function compactVenue({ listing, slots }: { listing: Listing; slots: Slot[] }): CompactVenue {
  const loc = listing?.location || {};
  const pricing = listing?.pricing || {};
  const rules = listing?.operational_rules || {};
  const open = freeSlots(slots)
    .slice(0, 5)
    .map((slot) => ({
      start: formatSlotTime(slot.event_start),
      remaining: Math.max(0, Number(slot.capacity || 0) - Number(slot.booked || 0)),
    }));
  return {
    title: listing?.title,
    area: loc.cityArea || loc.state || "Unknown",
    bookingType: listing?.booking_type,
    pricePerHourNaira: Math.round((Number(pricing.baseRatePerHour) || 0) / 100),
    maxCapacity: rules.maxCapacity || null,
    description: String(listing?.description || "").slice(0, 160),
    freeSlots: open,
  };
}

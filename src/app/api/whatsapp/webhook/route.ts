import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/supabase";
import { listListings } from "@/lib/db/supabase-queries";
import { getWhatsAppConfig, verifyWhatsAppSignature, sendWhatsAppText, sendWhatsAppList, sendWhatsAppButtons, markWhatsAppRead } from "@/lib/whatsapp/client";
import { handleMessage } from "@/lib/whatsapp/bot";
import { generateReply } from "@/lib/whatsapp/gemini";
import { getSession, setSession, deleteSession } from "@/lib/whatsapp/sessions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");
  const config = getWhatsAppConfig();

  if (mode === "subscribe" && token === config.verifyToken && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Verification failed", { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const config = getWhatsAppConfig();
    if (!config.token || !config.phoneNumberId) {
      console.error("[whatsapp] missing token or phone number id");
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const rawBody = await request.text();
    const signature = (request.headers.get("x-hub-signature-256") || "").replace("sha256=", "");
    if (config.appSecret) {
      if (!verifyWhatsAppSignature(rawBody, signature, config.appSecret)) {
        console.error("[whatsapp] invalid webhook signature");
        return NextResponse.json({ ok: true }, { status: 200 });
      }
    } else {
      // Dev/test: without WHATSAPP_APP_SECRET there is nothing to verify against.
      // Process anyway so a missing secret doesn't silently kill the flow.
      console.warn("[whatsapp] WHATSAPP_APP_SECRET is not set — skipping signature verification");
    }

    let payload: Record<string, unknown> & { entry?: Array<{ changes?: Array<{ value?: Record<string, unknown> & { messages?: Array<Record<string, unknown> & { from?: string; id?: string }> } }> }> };
    try {
      payload = JSON.parse(rawBody) as typeof payload;
    } catch {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const messages = value?.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const deps = {
      baseUrl: process.env.CLOCKHOST_BASE_URL || process.env.HOSTME_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
      listActiveListings: async ({ area }: { area?: string | null } = {}) => {
        const active = await listListings({ status: "active" });
        if (!area) return active as unknown as import("@/lib/whatsapp/bot").Listing[];
        const needle = (area as string).toLowerCase();
        return (active as unknown as Array<Record<string, unknown> & { location?: Record<string, unknown> }>).filter((listing) => {
          const loc = (listing.location || {}) as Record<string, unknown>;
          const haystack = [loc.cityArea, loc.state, loc.address, loc.name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return (haystack as string).includes(needle);
        }) as unknown as import("@/lib/whatsapp/bot").Listing[];
      },
      listSlots: async (listingId: string) => {
        const { data, error } = await supabase
          .from("slots")
          .select()
          .eq("listing_id", listingId);
        if (error) throw error;
        return (data || []) as unknown as import("@/lib/whatsapp/bot").Slot[];
      },
      generateReply,
    };

    for (const message of messages as Array<Record<string, unknown> & { from?: string; id?: string; type?: string }>) {
      const phone = message.from as string;

      // Acknowledge promptly while the bot works on a reply.
      if (message.id) await markWhatsAppRead(message.id as string, config as unknown as Parameters<typeof markWhatsAppRead>[1]);

      const text = interactiveToText(message);
      if (text === null) {
        // Unsupported message type (image, reaction, etc.).
        await sendWhatsAppText(phone as string, 'I only understand text right now. Try "find a venue in Ikeja".', config as unknown as Parameters<typeof sendWhatsAppText>[2]);
        continue;
      }

      try {
        // Load session from Supabase (persistent across cold starts)
        const existingState = await getSession(phone as string);
        const sessionsMap = new Map();
        if (existingState) sessionsMap.set(phone, existingState);

        const replies = await handleMessage({
          phone: phone as string,
          text: text as string,
          sessions: sessionsMap,
          deps: deps as unknown as Parameters<typeof handleMessage>[0]["deps"],
        });

        // Persist session state back to Supabase
        const newState = sessionsMap.get(phone);
        if (newState) {
          await setSession(phone as string, newState);
        } else if (existingState) {
          // Session was deleted (e.g. user sent "menu")
          await deleteSession(phone as string);
        }

        for (const reply of replies) {
          await sendDescriptor(
            phone as string,
            reply as unknown as Record<string, unknown> & { kind?: string; text?: string },
            config as unknown as Record<string, unknown>
          );
        }
      } catch (error) {
        console.error("[whatsapp] handler error:", error);
        await sendWhatsAppText(
          phone as string,
          "ClockHost is having trouble reaching its venues right now. Try again in a moment.",
          config as unknown as Parameters<typeof sendWhatsAppText>[2]
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/whatsapp/webhook error:", error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}

// Map an incoming WhatsApp message (text or interactive tap) to the bot's text input.
// Returns null for message types the bot cannot process.
function interactiveToText(message: Record<string, unknown> & { type?: string; text?: { body?: string }; interactive?: Record<string, unknown> & { type?: string; list_reply?: { id?: string; title?: string }; button_reply?: { id?: string } } }): string | null {
  if (message.type === "text") {
    return String(message.text?.body || "").trim();
  }
  if (message.type === "interactive") {
    const iv = message.interactive || {};
    if (iv.type === "list_reply") {
      return String(iv.list_reply?.id ?? iv.list_reply?.title ?? "").trim();
    }
    if (iv.type === "button_reply") {
      const id = String(iv.button_reply?.id ?? "").trim();
      if (id === "find_venue") return "find a venue";
      if (id === "group_booking") return "group booking";
      if (id === "about") return "about clockhost";
      if (id === "help") return "menu";
      return id;
    }
  }
  return null;
}

async function sendDescriptor(to: string, descriptor: Record<string, unknown> & { kind?: string; text?: string }, config: Record<string, unknown>): Promise<void> {
  if (descriptor?.kind === "list") {
    await sendWhatsAppList(to, descriptor as unknown as { body: string; button?: string; sections?: import("@/lib/whatsapp/client").WhatsAppListSection[] }, config as unknown as Parameters<typeof sendWhatsAppList>[2]);
    return;
  }
  if (descriptor?.kind === "buttons") {
    await sendWhatsAppButtons(to, descriptor as unknown as { body: string; buttons?: import("@/lib/whatsapp/client").WhatsAppButton[] }, config as unknown as Parameters<typeof sendWhatsAppButtons>[2]);
    return;
  }
  await sendWhatsAppText(to, descriptor?.text ?? String(descriptor ?? ""), config as unknown as Parameters<typeof sendWhatsAppText>[2]);
}
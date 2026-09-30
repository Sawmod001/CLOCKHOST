import crypto from "crypto";

const GRAPH_URL = "https://graph.facebook.com/v25.0";

export interface WhatsAppConfig {
  token?: string;
  phoneNumberId?: string;
  verifyToken?: string;
  appSecret?: string;
}

export interface WhatsAppButton {
  id: string;
  title: string;
}

export interface WhatsAppListSection {
  title?: string;
  rows: Record<string, unknown>[];
  [key: string]: unknown;
}

function creds(config: Partial<WhatsAppConfig> | undefined): { token: string; phoneNumberId: string } {
  const token = config?.token || process.env.WHATSAPP_TOKEN;
  const phoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WhatsApp is not configured");
  return { token, phoneNumberId };
}

async function graphPost(config: Partial<WhatsAppConfig> | undefined, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const { token, phoneNumberId } = creds(config);
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("WhatsApp send error:", res.status, errBody.slice(0, 500));
    throw new Error(`WhatsApp send failed (${res.status})`);
  }
  return (await res.json()) as Record<string, unknown>;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  return {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    appSecret: process.env.WHATSAPP_APP_SECRET,
  };
}

export function verifyWhatsAppSignature(rawBody: string, signatureHeader: string, appSecret: string): boolean {
  if (!appSecret || !signatureHeader) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader || "", "utf8");
  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function sendWhatsAppText(to: string, body: string, config?: Partial<WhatsAppConfig>): Promise<Record<string, unknown>> {
  return graphPost(config, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { body },
  });
}

export async function sendWhatsAppList(to: string, { body, button = "View options", sections = [] }: {
  body: string;
  button?: string;
  sections?: WhatsAppListSection[];
}, config?: Partial<WhatsAppConfig>): Promise<Record<string, unknown>> {
  return graphPost(config, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: String(body || "").slice(0, 1024) },
      action: { button, sections },
    },
  });
}

export async function sendWhatsAppButtons(to: string, { body, buttons = [] }: {
  body: string;
  buttons?: WhatsAppButton[];
}, config?: Partial<WhatsAppConfig>): Promise<Record<string, unknown>> {
  return graphPost(config, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: String(body || "").slice(0, 1024) },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({ type: "reply", reply: { id: b.id, title: String(b.title).slice(0, 20) } })),
      },
    },
  });
}

export async function markWhatsAppRead(messageId: string, config?: Partial<WhatsAppConfig>): Promise<void> {
  try {
    await graphPost(config, { messaging_product: "whatsapp", status: "read", message_id: messageId });
  } catch (error) {
    console.warn("WhatsApp mark-as-read failed:", (error as Error)?.message);
  }
}

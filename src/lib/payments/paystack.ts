/**
 * Paystack API integration.
 * Handles payment initialization, transaction verification, transfers and recipients.
 */

const PAYSTACK_BASE = "https://api.paystack.co";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitializeTransactionInput {
  amountKobo: number;
  email: string;
  reference: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export type InitializeTransactionResult =
  | { authorizationUrl: string; accessCode: string; mock?: boolean }
  | { error: string };

export type VerifyTransactionResult =
  | {
      status: string;
      amount: number;
      gatewayRef: string;
      paidAt: string;
      channel?: string;
      currency?: string;
      fees?: number;
      mock?: boolean;
    }
  | { error: string };

export interface InitiateTransferInput {
  amountKobo: number;
  recipientCode: string;
  reference: string;
  reason?: string;
}

export type InitiateTransferResult =
  | { transferCode: string; status: string; mock?: boolean }
  | { error: string };

export interface CreateTransferRecipientInput {
  name: string;
  email: string;
  bankCode?: string;
  accountNumber?: string;
}

export type CreateTransferRecipientResult =
  | { recipientCode: string; mock?: boolean }
  | { error: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSecretKey(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY;
}

async function paystackPost<T>(
  path: string,
  body: Record<string, unknown>,
  secretKey: string
): Promise<{ ok: boolean; data: T & { status?: boolean; message?: string } }> {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { status?: boolean; message?: string };
  return { ok: !!data.status, data };
}

async function paystackGet<T>(
  path: string,
  secretKey: string
): Promise<{ ok: boolean; data: T & { status?: boolean; message?: string } }> {
  const response = await fetch(`${PAYSTACK_BASE}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const data = (await response.json()) as T & { status?: boolean; message?: string };
  return { ok: !!data.status, data };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialize a Paystack transaction.
 * Returns mock data when `PAYSTACK_SECRET_KEY` is not set (dev/test mode).
 */
export async function initializeTransaction({
  amountKobo,
  email,
  reference,
  callbackUrl,
  metadata = {},
}: InitializeTransactionInput): Promise<InitializeTransactionResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return {
      authorizationUrl: `/api/payments/mock-confirm`,
      accessCode: "mock_access_code",
      mock: true,
    };
  }

  try {
    interface PaystackInitData {
      data?: { authorization_url?: string; access_code?: string };
      message?: string;
      status?: boolean;
    }
    const { ok, data } = await paystackPost<PaystackInitData>(
      "/transaction/initialize",
      { amount: amountKobo, email, reference, callback_url: callbackUrl, metadata },
      secretKey
    );
    if (!ok) return { error: data.message ?? "Paystack initialization failed" };
    return {
      authorizationUrl: (data as unknown as PaystackInitData).data?.authorization_url ?? "",
      accessCode: (data as unknown as PaystackInitData).data?.access_code ?? "",
    };
  } catch (error) {
    console.error("Paystack initialize error:", error);
    return { error: "Failed to initialize payment" };
  }
}

/**
 * Verify a Paystack transaction by reference.
 */
export async function verifyTransaction(
  reference: string
): Promise<VerifyTransactionResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return {
      status: "success",
      amount: 0,
      gatewayRef: `mock_${reference}`,
      paidAt: new Date().toISOString(),
      mock: true,
    };
  }

  try {
    interface PaystackVerifyData {
      data?: {
        status?: string;
        amount?: number;
        id?: string | number;
        reference?: string;
        paid_at?: string;
        created_at?: string;
        channel?: string;
        currency?: string;
        fees?: number;
      };
      message?: string;
      status?: boolean;
    }
    const { ok, data } = await paystackGet<PaystackVerifyData>(
      `/transaction/verify/${reference}`,
      secretKey
    );
    if (!ok) return { error: data.message ?? "Verification failed" };
    const tx = (data as unknown as PaystackVerifyData).data;
    return {
      status: tx?.status ?? "unknown",
      amount: tx?.amount ?? 0,
      gatewayRef: String(tx?.id ?? tx?.reference ?? reference),
      paidAt: tx?.paid_at ?? tx?.created_at ?? new Date().toISOString(),
      channel: tx?.channel,
      currency: tx?.currency,
      fees: tx?.fees,
    };
  } catch (error) {
    console.error("Paystack verify error:", error);
    return { error: "Failed to verify payment" };
  }
}

/**
 * Initiate a payout transfer to a host.
 * Requires Paystack Transfer Recipients and Transfers API access.
 */
export async function initiateTransfer({
  amountKobo,
  recipientCode,
  reference,
  reason,
}: InitiateTransferInput): Promise<InitiateTransferResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return { transferCode: `mock_transfer_${reference}`, status: "completed", mock: true };
  }

  try {
    interface PaystackTransferData {
      data?: { transfer_code?: string; status?: string };
      message?: string;
      status?: boolean;
    }
    const { ok, data } = await paystackPost<PaystackTransferData>(
      "/transfer",
      { source: "balance", amount: amountKobo, recipient: recipientCode, reference, reason },
      secretKey
    );
    if (!ok) return { error: data.message ?? "Transfer failed" };
    return {
      transferCode: (data as unknown as PaystackTransferData).data?.transfer_code ?? "",
      status: (data as unknown as PaystackTransferData).data?.status ?? "pending",
    };
  } catch (error) {
    console.error("Paystack transfer error:", error);
    return { error: "Failed to initiate transfer" };
  }
}

/**
 * Create a Paystack transfer recipient for a host.
 */
export async function createTransferRecipient({
  name,
  email,
  bankCode,
  accountNumber,
}: CreateTransferRecipientInput): Promise<CreateTransferRecipientResult> {
  const secretKey = getSecretKey();
  if (!secretKey) {
    return { recipientCode: `mock_recipient_${Date.now()}`, mock: true };
  }

  try {
    const body: Record<string, string> = { type: "nuban", name, email };
    if (bankCode && accountNumber) {
      body["bank_code"] = bankCode;
      body["account_number"] = accountNumber;
    }

    interface PaystackRecipientData {
      data?: { recipient_code?: string };
      message?: string;
      status?: boolean;
    }
    const { ok, data } = await paystackPost<PaystackRecipientData>(
      "/transferrecipient",
      body,
      secretKey
    );
    if (!ok) return { error: data.message ?? "Failed to create recipient" };
    return {
      recipientCode: (data as unknown as PaystackRecipientData).data?.recipient_code ?? "",
    };
  } catch (error) {
    console.error("Paystack create recipient error:", error);
    return { error: "Failed to create transfer recipient" };
  }
}

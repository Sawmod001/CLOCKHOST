import crypto from "crypto";

/**
 * Verify a Paystack webhook signature using HMAC-SHA512.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyPaystackSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string
): boolean {
  const expected = crypto
    .createHmac("sha512", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signatureHeader ?? "", "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
}

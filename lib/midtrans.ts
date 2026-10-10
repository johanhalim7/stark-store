import { createHash } from "crypto";

const SERVER_KEY = () => process.env.MIDTRANS_SERVER_KEY || "";
const CLIENT_KEY = () => process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
const IS_PRODUCTION = () => process.env.MIDTRANS_IS_PRODUCTION === "true";

export function midtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY);
}

function baseUrl(): string {
  return IS_PRODUCTION() ? "https://app.midtrans.com" : "https://app.sandbox.midtrans.com";
}

/** URL Snap.js untuk dimuat di browser (butuh NEXT_PUBLIC_MIDTRANS_CLIENT_KEY). */
export function snapJsUrl(): string {
  return IS_PRODUCTION()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function midtransClientKey(): string {
  return CLIENT_KEY();
}

export interface SnapItem {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

export interface SnapRequest {
  orderId: string;
  grossAmount: number;
  items: SnapItem[];
  customer: { first_name?: string; email?: string; phone?: string };
}

/**
 * Minta Snap token ke Midtrans. Nominal HARUS sudah divalidasi di server
 * (dihitung ulang dari DB) sebelum memanggil fungsi ini.
 */
export async function createSnapTransaction(
  req: SnapRequest
): Promise<{ token: string; redirect_url: string }> {
  if (!midtransConfigured()) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum diisi. Isi di .env lalu restart server."
    );
  }
  const auth = Buffer.from(`${SERVER_KEY()}:`).toString("base64");
  const res = await fetch(`${baseUrl()}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: req.orderId,
        gross_amount: req.grossAmount,
      },
      item_details: req.items,
      customer_details: req.customer,
      callbacks: { finish: `${process.env.NEXT_PUBLIC_APP_URL || ""}/orders` },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error_messages?: string[] })?.error_messages?.join("; ") ||
      `Midtrans error ${res.status}`;
    throw new Error(msg);
  }
  return data as { token: string; redirect_url: string };
}

export interface MidtransNotification {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
}

/**
 * Verifikasi signature_key notifikasi Midtrans:
 * SHA512(order_id + status_code + gross_amount + server_key)
 */
export function verifyMidtransSignature(n: MidtransNotification): boolean {
  if (!SERVER_KEY()) return false;
  const raw = `${n.order_id}${n.status_code}${n.gross_amount}${SERVER_KEY()}`;
  const expected = createHash("sha512").update(raw).digest("hex");
  return (
    expected.length === n.signature_key.length &&
    createHash("sha256").update(expected).digest("hex") ===
      createHash("sha256").update(n.signature_key).digest("hex")
  );
}

/** Status Midtrans yang berarti pembayaran sukses. */
export function isPaymentSuccess(n: MidtransNotification): boolean {
  if (n.transaction_status === "settlement") return true;
  if (n.transaction_status === "capture" && n.fraud_status === "accept") return true;
  return false;
}

/** Status Midtrans yang berarti pembayaran gagal/expired/cancel. */
export function isPaymentFailed(n: MidtransNotification): boolean {
  return ["deny", "expire", "cancel"].includes(n.transaction_status);
}

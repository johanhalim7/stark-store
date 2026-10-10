export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { restoreStock } from "@/lib/orders";
import {
  verifyMidtransSignature,
  isPaymentSuccess,
  isPaymentFailed,
  type MidtransNotification,
} from "@/lib/midtrans";

const ok = () => NextResponse.json({ ok: true });

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const notification = body as unknown as MidtransNotification;
  const { order_id, status_code, gross_amount, signature_key, transaction_status } =
    notification;

  if (
    !order_id ||
    !status_code ||
    !gross_amount ||
    !signature_key ||
    !transaction_status
  ) {
    return NextResponse.json(
      { error: "Notifikasi Midtrans tidak lengkap." },
      { status: 400 }
    );
  }

  if (!verifyMidtransSignature(notification)) {
    return NextResponse.json({ error: "Signature tidak valid." }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { midtransOrderId: order_id },
    include: { order: { include: { items: true } } },
  });
  if (!payment || !payment.order) {
    // Order tidak dikenal -> balas 200 agar Midtrans tidak retry sia-sia
    return ok();
  }

  const n = notification;
  const success = isPaymentSuccess(n);
  const failed = isPaymentFailed(n);
  const rawPayload = JSON.parse(JSON.stringify(body));

  await db.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        transactionStatus: n.transaction_status,
        fraudStatus: n.fraud_status ?? null,
        paymentType: n.payment_type ?? null,
        rawPayload,
        paidAt: success ? new Date() : payment.paidAt,
      },
    });

    const order = payment.order!;

    if (success && order.status === "PENDING_PAYMENT") {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { soldCount: { increment: item.qty } },
        });
      }
      return;
    }

    if (failed && order.status === "PENDING_PAYMENT") {
      const newStatus =
        n.transaction_status === "expire" ? "EXPIRED" : "CANCELLED";
      await tx.order.update({
        where: { id: order.id },
        data: { status: newStatus },
      });
      await restoreStock(tx, order.id);
      return;
    }

    // Idempoten: order sudah diproses sebelumnya -> hanya payment yang diupdate
  });

  return ok();
}

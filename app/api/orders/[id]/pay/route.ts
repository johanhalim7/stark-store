export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { expireOverdueOrders } from "@/lib/orders";
import {
  midtransConfigured,
  createSnapTransaction,
  type SnapItem,
} from "@/lib/midtrans";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;
    const { id } = await params;

    await expireOverdueOrders();

    const order = await db.order.findFirst({
      where: { id, userId: user.id },
      include: { items: true, shipment: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    if (order.status !== "PENDING_PAYMENT") {
      return NextResponse.json(
        { error: "Pesanan ini sudah tidak bisa dibayar." },
        { status: 400 }
      );
    }
    if (!midtransConfigured()) {
      return NextResponse.json(
        {
          error:
            "Pembayaran online belum dikonfigurasi. Hubungi admin toko untuk melanjutkan.",
        },
        { status: 503 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    // Hitung ulang total dari snapshot order (bukan dari client)
    const subtotal = order.items.reduce((s, i) => s + i.price * i.qty, 0);
    const shippingCost = order.shipment?.cost ?? order.shippingCost;
    const total = subtotal + shippingCost;

    const snapItems: SnapItem[] = [
      ...order.items.map((i) => ({
        id: i.variantId ?? i.id,
        price: i.price,
        quantity: i.qty,
        name: i.variantName ? `${i.name} (${i.variantName})` : i.name,
      })),
      {
        id: "ONGKIR",
        price: shippingCost,
        quantity: 1,
        name: `Ongkir ${order.courier.toUpperCase()} ${order.courierService}`,
      },
    ];

    let address: { recipientName?: string; phone?: string } = {};
    try {
      const snap = order.addressSnapshot as Record<string, unknown>;
      address = {
        recipientName:
          typeof snap.recipientName === "string" ? snap.recipientName : undefined,
        phone: typeof snap.phone === "string" ? snap.phone : undefined,
      };
    } catch {
      address = {};
    }

    let token: string;
    try {
      const snap = await createSnapTransaction({
        orderId: order.orderNumber,
        grossAmount: total,
        items: snapItems,
        customer: {
          first_name: address.recipientName,
          email: dbUser?.email ?? undefined,
          phone: address.phone,
        },
      });
      token = snap.token;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghubungi Midtrans.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    await db.order.update({
      where: { id: order.id },
      data: { snapToken: token },
    });

    return NextResponse.json({ snapToken: token, orderNumber: order.orderNumber });
  } catch {
    return serverError(null);
  }
}

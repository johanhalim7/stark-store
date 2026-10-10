export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";
import { expireOverdueOrders, restoreStock } from "@/lib/orders";

const patchSchema = z.object({
  action: z.enum(["cancel", "complete"], { error: "Aksi tidak valid." }),
});

export async function GET(
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
      include: {
        items: true,
        payment: true,
        shipment: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const reviewed = await db.review.findMany({
      where: { orderId: order.id, userId: user.id },
      select: { productId: true },
    });

    // Respons = objek order langsung (sesuai ekspektasi UI) + reviewedProductIds
    return NextResponse.json({
      ...order,
      reviewedProductIds: reviewed.map((r) => r.productId),
    });
  } catch {
    return serverError(null);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;
    const { id } = await params;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    await expireOverdueOrders();

    const order = await db.order.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (parsed.data.action === "cancel") {
      if (order.status !== "PENDING_PAYMENT") {
        return NextResponse.json(
          { error: "Pesanan ini sudah tidak bisa dibatalkan." },
          { status: 400 }
        );
      }
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });
        await restoreStock(tx, order.id);
      });
      return NextResponse.json({ ok: true, status: "CANCELLED" });
    }

    // action === "complete"
    if (order.status !== "SHIPPED") {
      return NextResponse.json(
        { error: "Pesanan hanya bisa diselesaikan bila sudah dikirim." },
        { status: 400 }
      );
    }
    await db.order.update({
      where: { id: order.id },
      data: { status: "COMPLETED" },
    });
    return NextResponse.json({ ok: true, status: "COMPLETED" });
  } catch {
    return serverError(null);
  }
}

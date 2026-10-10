export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { restoreStock } from "@/lib/orders";

const patchSchema = z.object({
  action: z.enum(["pack", "ship", "complete", "cancel"], { error: "Aksi tidak valid." }),
  trackingNumber: z.string().trim().max(100).optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: true,
        payment: true,
        shipment: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ order });
  } catch {
    return serverError(null);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { action, trackingNumber } = parsed.data;

    const order = await db.order.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    if (action === "pack") {
      if (order.status !== "PAID") {
        return NextResponse.json(
          { error: "Hanya pesanan berstatus Dibayar yang bisa dikemas." },
          { status: 400 }
        );
      }
      await db.order.update({
        where: { id: order.id },
        data: { status: "PACKED" },
      });
      return NextResponse.json({ ok: true, status: "PACKED" });
    }

    if (action === "ship") {
      if (order.status !== "PACKED") {
        return NextResponse.json(
          { error: "Hanya pesanan berstatus Dikemas yang bisa dikirim." },
          { status: 400 }
        );
      }
      if (!trackingNumber) {
        return NextResponse.json(
          { error: "Nomor resi wajib diisi untuk mengirim pesanan." },
          { status: 400 }
        );
      }
      await db.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "SHIPPED" },
        });
        await tx.shipment.update({
          where: { orderId: order.id },
          data: { trackingNumber, shippedAt: new Date() },
        });
      });
      return NextResponse.json({ ok: true, status: "SHIPPED" });
    }

    if (action === "complete") {
      if (order.status !== "SHIPPED") {
        return NextResponse.json(
          { error: "Hanya pesanan berstatus Dikirim yang bisa diselesaikan." },
          { status: 400 }
        );
      }
      await db.order.update({
        where: { id: order.id },
        data: { status: "COMPLETED" },
      });
      return NextResponse.json({ ok: true, status: "COMPLETED" });
    }

    // action === "cancel"
    if (order.status === "SHIPPED" || order.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Pesanan yang sudah dikirim/selesai tidak bisa dibatalkan." },
        { status: 400 }
      );
    }
    if (!["PENDING_PAYMENT", "PAID", "PACKED"].includes(order.status)) {
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
  } catch {
    return serverError(null);
  }
}

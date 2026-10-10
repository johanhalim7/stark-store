export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, serverError } from "@/lib/api";
import { expireOverdueOrders } from "@/lib/orders";

export async function GET() {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    await expireOverdueOrders();

    const orders = await db.order.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { items: true } },
        shipment: { select: { trackingNumber: true, courier: true, service: true } },
      },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        total: o.total,
        subtotal: o.subtotal,
        shippingCost: o.shippingCost,
        itemCount: o._count.items,
        shipment: o.shipment,
        expiresAt: o.expiresAt,
        createdAt: o.createdAt,
      })),
    });
  } catch {
    return serverError(null);
  }
}

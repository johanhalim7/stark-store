export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/api";

const PAID_STATUSES = ["PAID", "PACKED", "SHIPPED", "COMPLETED"] as const;

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const now = new Date();
    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const start30 = new Date(now);
    start30.setDate(start30.getDate() - 30);

    const [revenueToday, revenue30d, ordersByStatus, lowStock, pendingPaymentCount] =
      await Promise.all([
        db.order.aggregate({
          where: {
            status: { in: [...PAID_STATUSES] },
            createdAt: { gte: startToday },
          },
          _sum: { total: true },
        }),
        db.order.aggregate({
          where: {
            status: { in: [...PAID_STATUSES] },
            createdAt: { gte: start30 },
          },
          _sum: { total: true },
        }),
        db.order.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        db.productVariant.findMany({
          where: { stock: { lt: 5 }, isActive: true },
          take: 10,
          orderBy: { stock: "asc" },
          select: {
            id: true,
            name: true,
            stock: true,
            product: { select: { name: true } },
          },
        }),
        db.order.count({ where: { status: "PENDING_PAYMENT" } }),
      ]);

    return NextResponse.json({
      revenueToday: revenueToday._sum.total ?? 0,
      revenue30d: revenue30d._sum.total ?? 0,
      ordersByStatus: ordersByStatus.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      lowStock: lowStock.map((v) => ({
        variantId: v.id,
        productName: v.product.name,
        variantName: v.name,
        stock: v.stock,
      })),
      pendingPaymentCount,
    });
  } catch {
    return serverError(null);
  }
}

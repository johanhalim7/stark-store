export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/api";

const REVENUE_STATUSES = ["PAID", "PACKED", "SHIPPED", "COMPLETED"] as const;

function parseDate(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const url = new URL(req.url);
    const now = new Date();
    const toParam = parseDate(url.searchParams.get("to"));
    const fromParam = parseDate(url.searchParams.get("from"));

    const to = toParam ?? now;
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);
    const from = fromParam ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fromStart = new Date(from);
    fromStart.setHours(0, 0, 0, 0);

    if (fromStart > toEnd) {
      return NextResponse.json(
        { error: "Rentang tanggal tidak valid (from > to)." },
        { status: 400 }
      );
    }

    // Pendapatan per hari (hanya order PAID ke atas)
    const paidOrders = await db.order.findMany({
      where: {
        status: { in: [...REVENUE_STATUSES] },
        createdAt: { gte: fromStart, lte: toEnd },
      },
      select: { id: true, total: true, createdAt: true },
    });

    const dayMap = new Map<string, number>();
    for (const o of paidOrders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) ?? 0) + o.total);
    }
    const revenueByDay: { date: string; total: number }[] = [];
    const cursor = new Date(fromStart);
    while (cursor <= toEnd) {
      const key = cursor.toISOString().slice(0, 10);
      revenueByDay.push({ date: key, total: dayMap.get(key) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    // Produk terlaris
    const orderIds = paidOrders.map((o) => o.id);
    const items = orderIds.length
      ? await db.orderItem.findMany({
          where: { orderId: { in: orderIds } },
          select: { productId: true, name: true, price: true, qty: true },
        })
      : [];
    const prodMap = new Map<string, { productId: string; name: string; qty: number; revenue: number }>();
    for (const i of items) {
      const cur = prodMap.get(i.productId) ?? {
        productId: i.productId,
        name: i.name,
        qty: 0,
        revenue: 0,
      };
      cur.qty += i.qty;
      cur.revenue += i.price * i.qty;
      prodMap.set(i.productId, cur);
    }
    const topProducts = [...prodMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // Jumlah order per status pada rentang tanggal
    const statusCounts = await db.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: fromStart, lte: toEnd } },
      _count: { _all: true },
    });

    return NextResponse.json({
      from: fromStart.toISOString().slice(0, 10),
      to: toEnd.toISOString().slice(0, 10),
      revenueByDay,
      topProducts,
      statusCounts: statusCounts.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
    });
  } catch {
    return serverError(null);
  }
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, serverError } from "@/lib/api";

const STATUSES = [
  "PENDING_PAYMENT",
  "PAID",
  "PACKED",
  "SHIPPED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
] as const;

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const statusParam = (new URL(req.url).searchParams.get("status") || "").trim();
    const status =
      (STATUSES as readonly string[]).includes(statusParam) && statusParam
        ? (statusParam as (typeof STATUSES)[number])
        : undefined;

    const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
    const perPage = 20;

    const where = status ? { status } : {};

    const [total, orders] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          total: true,
          subtotal: true,
          shippingCost: true,
          courier: true,
          courierService: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
          _count: { select: { items: true } },
        },
      }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => {
        const { _count, ...rest } = o;
        return { ...rest, itemCount: _count.items };
      }),
      total,
      page,
      perPage,
    });
  } catch {
    return serverError(null);
  }
}

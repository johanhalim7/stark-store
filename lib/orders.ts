import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Tx = Prisma.TransactionClient;

/**
 * Kembalikan stok varian dari semua item sebuah order.
 * Harus dipanggil di dalam transaksi.
 */
export async function restoreStock(tx: Tx, orderId: string): Promise<void> {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    select: { variantId: true, qty: true },
  });
  for (const item of items) {
    if (!item.variantId) continue;
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.qty } },
    });
  }
}

/**
 * Kedaluwarsakan semua order PENDING_PAYMENT yang melewati expiresAt,
 * dan kembalikan stoknya. Return jumlah order yang diproses.
 */
export async function expireOverdueOrders(): Promise<number> {
  const now = new Date();
  const overdue = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", expiresAt: { lt: now } },
    select: { id: true },
  });
  let count = 0;
  for (const o of overdue) {
    await db.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({
        where: { id: o.id, status: "PENDING_PAYMENT" },
        data: { status: "EXPIRED" },
      });
      if (updated.count === 0) return; // sudah diproses thread lain
      await restoreStock(tx, o.id);
      count++;
    });
  }
  return count;
}

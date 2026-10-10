import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatRupiah, ORDER_STATUS_LABEL } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAID_STATUSES: OrderStatus[] = ["PAID", "PACKED", "SHIPPED", "COMPLETED"];

export default async function AdminDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d30 = new Date();
  d30.setDate(d30.getDate() - 30);

  const [revToday, rev30d, byStatus, lowStock, pendingPayment] = await Promise.all([
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: today } },
    }),
    db.order.aggregate({
      _sum: { total: true },
      where: { status: { in: PAID_STATUSES }, createdAt: { gte: d30 } },
    }),
    db.order.groupBy({ by: ["status"], _count: { status: true } }),
    db.productVariant.findMany({
      where: { stock: { lte: 5 }, isActive: true },
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { stock: "asc" },
      take: 10,
    }),
    db.order.count({ where: { status: "PENDING_PAYMENT" } }),
  ]);

  const revenueToday = revToday._sum.total ?? 0;
  const revenue30d = rev30d._sum.total ?? 0;
  const needProcess = byStatus
    .filter((b) => b.status === "PAID")
    .reduce((s, b) => s + b._count.status, 0);

  const countByStatus: Record<string, number> = {};
  for (const b of byStatus) countByStatus[b.status] = b._count.status;
  const maxCount = Math.max(1, ...Object.values(countByStatus));

  const cards = [
    { label: "Omzet Hari Ini", value: formatRupiah(revenueToday), icon: "💰" },
    { label: "Omzet 30 Hari", value: formatRupiah(revenue30d), icon: "📈" },
    { label: "Perlu Diproses", value: String(needProcess), icon: "📦", hint: "pesanan sudah dibayar" },
    { label: "Menunggu Bayar", value: String(pendingPayment), icon: "⏳", hint: "belum dibayar" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{c.icon}</span>
              <p className="text-xs font-medium text-gray-500">{c.label}</p>
            </div>
            <p className="mt-2 text-xl font-bold text-gray-900">{c.value}</p>
            {c.hint && <p className="mt-0.5 text-xs text-gray-400">{c.hint}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-900">Pesanan per Status</h2>
          <div className="space-y-2.5">
            {(Object.keys(ORDER_STATUS_LABEL) as OrderStatus[]).map((s) => {
              const n = countByStatus[s] ?? 0;
              return (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-36 shrink-0 text-gray-600">{ORDER_STATUS_LABEL[s]}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(n / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-semibold tabular-nums">{n}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-bold text-gray-900">⚠️ Stok Menipis (≤ 5)</h2>
          {lowStock.length === 0 ? (
            <p className="text-sm text-gray-500">Semua stok aman.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                    <th className="py-2 pr-2 font-medium">Produk</th>
                    <th className="py-2 pr-2 font-medium">Varian</th>
                    <th className="py-2 text-right font-medium">Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((v) => (
                    <tr key={v.id} className="border-b border-gray-50 last:border-0">
                      <td className="py-2 pr-2 font-medium text-gray-900">{v.product.name}</td>
                      <td className="py-2 pr-2 text-gray-600">{v.name}</td>
                      <td
                        className={`py-2 text-right font-bold tabular-nums ${
                          v.stock === 0 ? "text-red-600" : "text-amber-600"
                        }`}
                      >
                        {v.stock}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

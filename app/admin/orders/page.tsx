import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.status;
  const statusFilter = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const validFilter = STATUSES.includes(statusFilter as OrderStatus)
    ? (statusFilter as OrderStatus)
    : undefined;

  const orders = await db.order.findMany({
    where: validFilter ? { status: validFilter } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { email: true, name: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Pesanan</h1>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Link
          href="/admin/orders"
          className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
            !validFilter ? "bg-primary text-white" : "bg-white text-gray-600 shadow-sm"
          }`}
        >
          Semua
        </Link>
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              validFilter === s
                ? "bg-primary text-white"
                : "bg-white text-gray-600 shadow-sm"
            }`}
          >
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3 font-medium">No. Pesanan</th>
              <th className="px-4 py-3 font-medium">Tanggal</th>
              <th className="px-4 py-3 font-medium">Pembeli</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                <td className="px-4 py-3 font-medium text-gray-900">{o.orderNumber}</td>
                <td className="px-4 py-3 text-gray-600">{formatDate(o.createdAt)}</td>
                <td className="px-4 py-3 text-gray-600">
                  <p className="line-clamp-1">{o.user.name || "—"}</p>
                  <p className="text-xs text-gray-400">{o.user.email}</p>
                </td>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  {formatRupiah(o.total)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={o.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                  {validFilter
                    ? `Tidak ada pesanan berstatus "${ORDER_STATUS_LABEL[validFilter]}".`
                    : "Belum ada pesanan."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

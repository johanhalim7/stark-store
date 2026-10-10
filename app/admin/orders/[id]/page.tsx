"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatRupiah, formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { apiError, type OrderDetailData } from "@/lib/ui-types";

interface AdminOrderDetail extends OrderDetailData {
  user?: { name: string | null; email: string };
}

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [tracking, setTracking] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat pesanan"));
        return;
      }
      const data = await res.json();
      const o: AdminOrderDetail = data.order ?? data;
      setOrder(o);
      setTracking(o.shipment?.trackingNumber ?? "");
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: "pack" | "ship" | "complete" | "cancel") => {
    if (action === "cancel" && !confirm("Yakin ingin membatalkan pesanan ini?")) return;
    if (action === "ship" && !tracking.trim()) {
      alert("Isi nomor resi terlebih dahulu.");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "ship" ? { trackingNumber: tracking.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal memproses aksi"));
        return;
      }
      await load();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 animate-pulse rounded-xl bg-white" />
        <div className="h-32 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={load} className="mt-3 text-sm font-medium text-primary hover:underline">
          Coba lagi
        </button>
      </div>
    );
  }

  if (!order) return null;

  const addr = order.addressSnapshot ?? {};
  const st = order.status;

  return (
    <div className="space-y-4">
      <Link href="/admin/orders" className="text-sm text-primary hover:underline">
        ‹ Kembali ke daftar pesanan
      </Link>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-xs text-gray-400">
              {formatDate(order.createdAt)} • {order.user?.name || "—"} ({order.user?.email || "—"})
            </p>
          </div>
          <StatusBadge status={st} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {st === "PAID" && (
            <button onClick={() => act("pack")} disabled={acting} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              {acting ? "Memproses…" : "📦 Kemas Pesanan"}
            </button>
          )}
          {st === "PACKED" && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Nomor resi *"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              <button onClick={() => act("ship")} disabled={acting} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
                {acting ? "Memproses…" : "🚚 Kirim"}
              </button>
            </div>
          )}
          {st === "SHIPPED" && (
            <button onClick={() => act("complete")} disabled={acting} className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {acting ? "Memproses…" : "✓ Selesaikan"}
            </button>
          )}
          {(st === "PENDING_PAYMENT" || st === "PAID" || st === "PACKED") && (
            <button onClick={() => act("cancel")} disabled={acting} className="rounded-lg border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">
              Batalkan Pesanan
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-bold text-gray-900">📍 Alamat Pengiriman</h2>
          <p className="text-sm font-medium text-gray-900">
            {addr.recipientName} <span className="font-normal text-gray-500">({addr.phone})</span>
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {[addr.detail, addr.subdistrict, addr.city, addr.province, addr.postalCode]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-bold text-gray-900">💳 Pembayaran & Pengiriman</h2>
          <dl className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <dt>Status bayar</dt>
              <dd className="font-medium text-gray-900">{order.payment?.transactionStatus ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Metode</dt>
              <dd className="font-medium text-gray-900">{order.payment?.paymentType ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Kurir</dt>
              <dd className="font-medium text-gray-900">
                {order.courier?.toUpperCase()} {order.courierService}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt>No. Resi</dt>
              <dd className="font-medium text-gray-900">{order.shipment?.trackingNumber || "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">🛍️ Item Pesanan</h2>
        <div className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 text-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                {it.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{it.name}</p>
                {it.variantName && <p className="text-xs text-gray-500">{it.variantName}</p>}
                <p className="text-xs text-gray-500">
                  {formatRupiah(it.price)} × {it.qty}
                </p>
              </div>
              <p className="font-semibold">{formatRupiah(it.price * it.qty)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Ongkir</span>
            <span>{formatRupiah(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

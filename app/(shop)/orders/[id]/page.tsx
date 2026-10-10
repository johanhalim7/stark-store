"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import Stars from "@/components/Stars";
import EmptyState from "@/components/EmptyState";
import {
  apiError,
  type CheckoutConfig,
  type OrderDetailData,
} from "@/lib/ui-types";

const TIMELINE = ["PENDING_PAYMENT", "PAID", "PACKED", "SHIPPED", "COMPLETED"];

function loadSnapJs(src: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const existing = document.querySelector(
      'script[data-snap="1"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Snap.js")));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.setAttribute("data-client-key", clientKey);
    s.setAttribute("data-snap", "1");
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Gagal memuat Snap.js Midtrans"));
    document.body.appendChild(s);
  });
}

function ReviewForm({
  orderId,
  productId,
  productName,
  onDone,
}: {
  orderId: string;
  productId: string;
  productName: string;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, productId, rating, title: title || undefined, body: body || undefined }),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal mengirim ulasan"));
        return;
      }
      onDone();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-2 rounded-lg border border-gray-200 p-3">
      <p className="text-sm font-medium text-gray-900">Beri ulasan untuk: {productName}</p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            aria-label={`${i} bintang`}
            className={`text-2xl ${i <= rating ? "text-amber-400" : "text-gray-300"}`}
          >
            ★
          </button>
        ))}
        <span className="ml-1 text-sm text-gray-500">{rating}/5</span>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Judul ulasan (opsional)"
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Ceritakan pengalamanmu dengan produk ini…"
        rows={3}
        className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {saving ? "Mengirim…" : "Kirim Ulasan"}
      </button>
    </form>
  );
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { status } = useSession();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionInfo, setActionInfo] = useState("");
  const [reviewed, setReviewed] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}`);
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/orders/${id}`);
        return;
      }
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat detail pesanan"));
        return;
      }
      const data: OrderDetailData = await res.json();
      setOrder(data);
      setReviewed(data.reviewedProductIds ?? []);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/orders/${id}`);
      return;
    }
    if (status === "authenticated") load();
  }, [status, load, router, id]);

  const doPatch = async (action: "cancel" | "complete") => {
    if (action === "cancel" && !confirm("Yakin ingin membatalkan pesanan ini?")) return;
    setActionLoading(action);
    setActionError("");
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setActionError(await apiError(res, "Gagal memproses permintaan"));
        return;
      }
      await load();
    } catch {
      setActionError("Tidak dapat terhubung ke server.");
    } finally {
      setActionLoading(null);
    }
  };

  const payNow = async () => {
    setActionLoading("pay");
    setActionError("");
    setActionInfo("");
    try {
      const cfgRes = await fetch("/api/checkout/config");
      const cfg: CheckoutConfig = cfgRes.ok ? await cfgRes.json() : { midtransReady: false } as CheckoutConfig;
      if (!cfg.midtransReady) {
        setActionError("Pembayaran online belum dikonfigurasi (Midtrans).");
        return;
      }
      const res = await fetch(`/api/orders/${id}/pay`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setActionError(typeof data.error === "string" ? data.error : "Gagal membuat pembayaran");
        return;
      }
      await loadSnapJs(cfg.snapJsUrl, cfg.clientKey);
      if (!window.snap) throw new Error("Snap.js gagal dimuat");
      window.snap.pay(data.snapToken as string, {
        onSuccess: () => load(),
        onPending: () => load(),
        onError: () => setActionError("Pembayaran gagal. Silakan coba lagi."),
        onClose: () =>
          setActionInfo("Jendela pembayaran ditutup. Anda bisa mencoba bayar lagi kapan saja."),
      });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-3">
        <div className="h-48 animate-pulse rounded-xl bg-white" />
        <div className="h-32 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        subtitle={error || "Pesanan tidak ada atau bukan milik Anda."}
        action={
          <Link
            href="/orders"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Kembali ke Daftar Pesanan
          </Link>
        }
      />
    );
  }

  const addr = order.addressSnapshot ?? {};
  const activeIdx = TIMELINE.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED" || order.status === "EXPIRED";

  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm text-primary hover:underline">
        ‹ Kembali ke daftar pesanan
      </Link>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-xs text-gray-400">
              Dibuat {formatDate(order.createdAt)}
              {order.paidAt ? ` • Dibayar ${formatDate(order.paidAt)}` : ""}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Timeline */}
        {!isCancelled && (
          <div className="mt-5 flex items-center">
            {TIMELINE.map((s, i) => (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      i <= activeIdx ? "bg-primary text-white" : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {i < activeIdx ? "✓" : i + 1}
                  </span>
                  <span className="mt-1 hidden text-[10px] text-gray-500 sm:block">
                    {ORDER_STATUS_LABEL[s]}
                  </span>
                </div>
                {i < TIMELINE.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 ${i < activeIdx ? "bg-primary" : "bg-gray-200"}`}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alamat */}
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

      {/* Item */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">🛍️ Produk Dipesan</h2>
        <div className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id}>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {it.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{it.name}</p>
                  {it.variantName && <p className="text-xs text-gray-500">{it.variantName}</p>}
                  <p className="text-xs text-gray-500">× {it.qty}</p>
                </div>
                <p className="font-semibold">{formatRupiah(it.price * it.qty)}</p>
              </div>
              {order.status === "COMPLETED" && !reviewed.includes(it.productId) && (
                <ReviewForm
                  orderId={order.id}
                  productId={it.productId}
                  productName={it.name}
                  onDone={() => setReviewed((r) => [...r, it.productId])}
                />
              )}
              {order.status === "COMPLETED" && reviewed.includes(it.productId) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <Stars value={5} size="text-xs" /> Ulasan terkirim, terima kasih!
                </p>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>
              Ongkir ({order.courier?.toUpperCase()} {order.courierService})
            </span>
            <span>{formatRupiah(order.shippingCost)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatRupiah(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Pembayaran & pengiriman */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-bold text-gray-900">💳 Pembayaran</h2>
          {order.payment ? (
            <dl className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Status</dt>
                <dd className="font-medium text-gray-900">{order.payment.transactionStatus}</dd>
              </div>
              {order.payment.paymentType && (
                <div className="flex justify-between">
                  <dt>Metode</dt>
                  <dd className="font-medium text-gray-900">{order.payment.paymentType}</dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Belum ada info pembayaran.</p>
          )}
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-bold text-gray-900">📦 Pengiriman</h2>
          {order.shipment ? (
            <dl className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <dt>Kurir</dt>
                <dd className="font-medium text-gray-900">
                  {order.shipment.courier?.toUpperCase()} {order.shipment.service}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>No. Resi</dt>
                <dd className="font-medium text-gray-900">
                  {order.shipment.trackingNumber || "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-gray-500">Belum dikirim.</p>
          )}
        </div>
      </div>

      {/* Aksi */}
      <div className="rounded-xl bg-white p-5 shadow-sm">
        {actionError && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
        )}
        {actionInfo && (
          <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{actionInfo}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {order.status === "PENDING_PAYMENT" && (
            <>
              <button
                onClick={payNow}
                disabled={actionLoading !== null}
                className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {actionLoading === "pay" ? "Memproses…" : "Bayar Sekarang"}
              </button>
              <button
                onClick={() => doPatch("cancel")}
                disabled={actionLoading !== null}
                className="rounded-lg border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {actionLoading === "cancel" ? "Membatalkan…" : "Batalkan Pesanan"}
              </button>
            </>
          )}
          {order.status === "SHIPPED" && (
            <button
              onClick={() => doPatch("complete")}
              disabled={actionLoading !== null}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === "complete" ? "Memproses…" : "Pesanan Diterima"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

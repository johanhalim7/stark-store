"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah, formatDate, ORDER_STATUS_LABEL } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import EmptyState from "@/components/EmptyState";
import { apiError, type OrderListItem } from "@/lib/ui-types";

const FILTERS = ["SEMUA", ...Object.keys(ORDER_STATUS_LABEL)];

export default function OrdersPage() {
  const { status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("SEMUA");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/orders");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/orders");
        return;
      }
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat pesanan"));
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : data.orders ?? []);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/orders");
      return;
    }
    if (status === "authenticated") load();
  }, [status, load, router]);

  const filtered =
    filter === "SEMUA" ? orders : orders.filter((o) => o.status === filter);

  if (status === "loading" || loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Pesanan Saya</h1>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f
                ? "bg-primary text-white"
                : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {f === "SEMUA" ? "Semua" : ORDER_STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Coba lagi
          </button>
        </p>
      )}

      {filtered.length === 0 && !error ? (
        <EmptyState
          title={filter === "SEMUA" ? "Belum ada pesanan" : "Tidak ada pesanan pada status ini"}
          subtitle="Pesanan yang Anda buat akan muncul di sini."
          action={
            <Link
              href="/products"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Mulai Belanja
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <div key={o.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-gray-900">{o.orderNumber}</p>
                  <p className="text-xs text-gray-400">{formatDate(o.createdAt)}</p>
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="text-sm text-gray-500">
                  Total:{" "}
                  <span className="text-base font-bold text-primary">
                    {formatRupiah(o.total)}
                  </span>
                </p>
                <Link
                  href={`/orders/${o.id}`}
                  className="rounded-lg border border-primary px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary-light"
                >
                  Detail
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

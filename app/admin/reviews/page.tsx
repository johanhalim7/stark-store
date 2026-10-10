"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import Stars from "@/components/Stars";
import { apiError } from "@/lib/ui-types";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  isHidden: boolean;
  createdAt: string;
  product?: { name: string };
  user?: { name: string | null; email?: string };
  order?: { orderNumber: string };
}

function normalizeList(data: unknown): Review[] {
  if (Array.isArray(data)) return data as Review[];
  const v = (data as { reviews?: unknown })?.reviews;
  return Array.isArray(v) ? (v as Review[]) : [];
}

export default function AdminReviewsPage() {
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews");
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat ulasan"));
        return;
      }
      setList(normalizeList(await res.json()));
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (r: Review) => {
    setToggling(r.id);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, isHidden: !r.isHidden }),
      });
      if (!res.ok) {
        alert(await apiError(res, "Gagal mengubah status ulasan"));
        return;
      }
      setList((prev) =>
        prev.map((x) => (x.id === r.id ? { ...x, isHidden: !x.isHidden } : x))
      );
    } catch {
      alert("Tidak dapat terhubung ke server.");
    } finally {
      setToggling(null);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Ulasan Pembeli</h1>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{" "}
          <button onClick={load} className="font-semibold underline">
            Coba lagi
          </button>
        </p>
      )}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-white" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          Belum ada ulasan.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div
              key={r.id}
              className={`rounded-xl bg-white p-4 shadow-sm ${r.isHidden ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <Stars value={r.rating} size="text-sm" />
                <span className="text-sm font-medium text-gray-900">
                  {r.user?.name || "Pembeli"}
                </span>
                <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
                {r.isHidden && (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                    Disembunyikan
                  </span>
                )}
                <button
                  onClick={() => toggle(r)}
                  disabled={toggling === r.id}
                  className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {toggling === r.id
                    ? "…"
                    : r.isHidden
                      ? "Tampilkan"
                      : "Sembunyikan"}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {r.product?.name || "Produk"} • {r.order?.orderNumber || ""}
              </p>
              {r.title && (
                <p className="mt-2 text-sm font-semibold text-gray-800">{r.title}</p>
              )}
              {r.body && (
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{r.body}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

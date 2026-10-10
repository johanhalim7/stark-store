"use client";

import { useCallback, useEffect, useState } from "react";
import { formatRupiah, ORDER_STATUS_LABEL } from "@/lib/format";
import { apiError } from "@/lib/ui-types";

interface ReportData {
  revenueByDay: { date: string; total: number }[];
  topProducts: { productId: string; name: string; qty: number; revenue: number }[];
  statusCounts: Record<string, number>;
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(
    new Date(y, m - 1, d)
  );
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(new Date()));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/reports?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}`
      );
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat laporan"));
        setData(null);
        return;
      }
      const d = await res.json();
      setData({
        revenueByDay: Array.isArray(d.revenueByDay) ? d.revenueByDay : [],
        topProducts: Array.isArray(d.topProducts) ? d.topProducts : [],
        statusCounts:
          d.statusCounts && typeof d.statusCounts === "object" ? d.statusCounts : {},
      });
    } catch {
      setError("Tidak dapat terhubung ke server.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalRevenue = (data?.revenueByDay ?? []).reduce((s, r) => s + (r.total || 0), 0);
  const maxDay = Math.max(1, ...(data?.revenueByDay ?? []).map((r) => r.total || 0));

  const exportCSV = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push(`Laporan Stark Store,${from} s/d ${to}`);
    lines.push("");
    lines.push("Pendapatan per Hari");
    lines.push("Tanggal,Total (Rp)");
    for (const r of data.revenueByDay) {
      lines.push(`${r.date},${r.total}`);
    }
    lines.push("");
    lines.push("Produk Terlaris");
    lines.push("Nama Produk,Terjual (qty),Pendapatan (Rp)");
    for (const p of data.topProducts) {
      const name = `"${p.name.replace(/"/g, '""')}"`;
      lines.push(`${name},${p.qty},${p.revenue}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan-stark-store-${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputCls =
    "rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
        <button
          onClick={exportCSV}
          disabled={!data}
          className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-50"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Dari</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Sampai</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
        </div>
        <button
          onClick={() => load(from, to)}
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Omzet Periode</p>
              <p className="mt-1 text-xl font-bold text-primary">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Total Produk Terjual</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {data.topProducts.reduce((s, p) => s + (p.qty || 0), 0)}
              </p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Pesanan Selesai</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                {data.statusCounts["COMPLETED"] ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-gray-900">Pendapatan per Hari</h2>
            {data.revenueByDay.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada data pada periode ini.</p>
            ) : (
              <div className="space-y-2">
                {data.revenueByDay.map((r) => (
                  <div key={r.date} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-gray-500">{formatDayLabel(r.date)}</span>
                    <div className="h-5 flex-1 overflow-hidden rounded bg-gray-100">
                      <div
                        className="h-full rounded bg-primary"
                        style={{ width: `${((r.total || 0) / maxDay) * 100}%` }}
                        title={formatRupiah(r.total || 0)}
                      />
                    </div>
                    <span className="w-32 shrink-0 text-right font-semibold tabular-nums">
                      {formatRupiah(r.total || 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-gray-900">🏆 Produk Terlaris</h2>
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada penjualan.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                        <th className="py-2 pr-2 font-medium">Produk</th>
                        <th className="py-2 pr-2 text-right font-medium">Qty</th>
                        <th className="py-2 text-right font-medium">Omzet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((p) => (
                        <tr key={p.productId} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-2 font-medium text-gray-900">{p.name}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{p.qty}</td>
                          <td className="py-2 text-right font-semibold tabular-nums">
                            {formatRupiah(p.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-gray-900">Pesanan per Status</h2>
              <div className="space-y-2">
                {Object.keys(ORDER_STATUS_LABEL).map((s) => (
                  <div key={s} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{ORDER_STATUS_LABEL[s]}</span>
                    <span className="font-bold tabular-nums">{data.statusCounts[s] ?? 0}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

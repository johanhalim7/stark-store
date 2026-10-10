"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiError } from "@/lib/ui-types";

export default function ProductRowActions({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (
      !confirm(
        isActive
          ? "Nonaktifkan produk ini? Produk tidak akan tampil di toko."
          : "Aktifkan kembali produk ini?"
      )
    )
      return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      if (!res.ok) {
        alert(await apiError(res, "Gagal mengubah status produk"));
        return;
      }
      router.refresh();
    } catch {
      alert("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/admin/products/${id}`}
        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Ubah
      </Link>
      <button
        onClick={toggle}
        disabled={loading}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
          isActive
            ? "border border-red-200 text-red-600 hover:bg-red-50"
            : "border border-green-200 text-green-700 hover:bg-green-50"
        }`}
      >
        {loading ? "…" : isActive ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/format";
import QuantitySelector from "./QuantitySelector";
import { apiError } from "@/lib/ui-types";

export interface BuyVariant {
  id: string;
  name: string;
  price: number | null;
  stock: number;
}

export default function BuyBox({
  slug,
  basePrice,
  compareAtPrice,
  variants,
}: {
  slug: string;
  basePrice: number;
  compareAtPrice: number | null;
  variants: BuyVariant[];
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState<"cart" | "buy" | null>(null);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const price = variant ? variant.price ?? basePrice : basePrice;
  const stock = variant?.stock ?? 0;

  const addToCart = async (): Promise<boolean> => {
    setError("");
    setOkMsg("");
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: variant?.id, qty }),
    });
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/products/${slug}`)}`);
      return false;
    }
    if (!res.ok) {
      setError(await apiError(res, "Gagal menambahkan ke keranjang"));
      return false;
    }
    window.dispatchEvent(new CustomEvent("cart-updated"));
    return true;
  };

  const handleCart = async () => {
    setLoading("cart");
    const ok = await addToCart();
    if (ok) setOkMsg("Ditambahkan ke keranjang ✓");
    setLoading(null);
  };

  const handleBuy = async () => {
    setLoading("buy");
    const ok = await addToCart();
    setLoading(null);
    if (ok) router.push("/checkout");
  };

  if (!variant) {
    return (
      <div className="rounded-xl bg-white p-5 text-sm text-gray-500 shadow-sm">
        Produk ini belum memiliki varian yang aktif.
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-primary">{formatRupiah(price)}</span>
        {compareAtPrice && compareAtPrice > price && (
          <span className="text-sm text-gray-400 line-through">
            {formatRupiah(compareAtPrice)}
          </span>
        )}
      </div>

      {variants.length > 1 && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-gray-700">Pilih Varian</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                disabled={v.stock <= 0}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  v.id === variantId
                    ? "border-primary bg-primary-light font-semibold text-primary"
                    : "border-gray-200 text-gray-700 hover:border-gray-400"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <p className="text-sm font-medium text-gray-700">Jumlah</p>
        <QuantitySelector
          value={qty}
          onChange={setQty}
          min={1}
          max={Math.max(1, Math.min(stock, 99))}
        />
        <p className="text-sm text-gray-500">
          Stok: <span className={stock <= 0 ? "font-semibold text-red-600" : ""}>{stock}</span>
        </p>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      {okMsg && (
        <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{okMsg}</p>
      )}

      <div className="mt-5 flex gap-2">
        <button
          onClick={handleCart}
          disabled={loading !== null || stock <= 0}
          className="flex-1 rounded-lg border-2 border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light disabled:opacity-40"
        >
          {loading === "cart" ? "Menambahkan…" : "+ Keranjang"}
        </button>
        <button
          onClick={handleBuy}
          disabled={loading !== null || stock <= 0}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-40"
        >
          {loading === "buy" ? "Memproses…" : "Beli Sekarang"}
        </button>
      </div>
      {stock <= 0 && (
        <p className="mt-2 text-center text-sm text-red-600">Stok varian ini habis.</p>
      )}
    </div>
  );
}

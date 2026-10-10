"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah } from "@/lib/format";
import QuantitySelector from "@/components/QuantitySelector";
import EmptyState from "@/components/EmptyState";
import { apiError, type CartData } from "@/lib/ui-types";

export default function CartPage() {
  const { status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cart");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/cart");
        return;
      }
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat keranjang"));
        return;
      }
      setCart(await res.json());
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/cart");
      return;
    }
    if (status === "authenticated") load();
  }, [status, load, router]);

  const updateQty = async (variantId: string, qty: number) => {
    setUpdating(variantId);
    try {
      const res = await fetch("/api/cart", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, qty }),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal mengubah jumlah"));
      } else {
        setCart(await res.json());
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setUpdating(null);
    }
  };

  const removeItem = async (variantId: string) => {
    if (!confirm("Hapus produk ini dari keranjang?")) return;
    setUpdating(variantId);
    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId }),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal menghapus item"));
      } else {
        setCart(await res.json());
        window.dispatchEvent(new CustomEvent("cart-updated"));
      }
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setUpdating(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
    );
  }

  if (error && !cart) {
    return (
      <EmptyState
        title="Gagal memuat keranjang"
        subtitle={error}
        action={
          <button
            onClick={load}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Coba Lagi
          </button>
        }
      />
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <EmptyState
        title="Keranjang masih kosong"
        subtitle="Yuk, jelajahi katalog dan temukan produk favoritmu!"
        action={
          <Link
            href="/products"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Mulai Belanja
          </Link>
        }
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-3 lg:col-span-2">
        <h1 className="text-xl font-bold text-gray-900">
          Keranjang Belanja ({cart.items.length})
        </h1>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}
        {cart.items.map((it) => {
          const price = it.variant.price ?? it.product.price;
          const img = it.product.images?.[0];
          return (
            <div
              key={it.variantId}
              className="flex gap-3 rounded-xl bg-white p-3 shadow-sm"
            >
              <Link
                href={`/products/${it.product.slug}`}
                className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gray-100"
              >
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt={it.product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-gray-300">
                    🖼️
                  </div>
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <Link
                  href={`/products/${it.product.slug}`}
                  className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-primary"
                >
                  {it.product.name}
                </Link>
                <p className="mt-0.5 text-xs text-gray-500">Varian: {it.variant.name}</p>
                <p className="mt-1 text-sm font-bold text-primary">
                  {formatRupiah(price)}
                </p>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <QuantitySelector
                    value={it.qty}
                    onChange={(v) => updateQty(it.variantId, v)}
                    min={1}
                    max={Math.max(1, it.variant.stock)}
                  />
                  <button
                    onClick={() => removeItem(it.variantId)}
                    disabled={updating === it.variantId}
                    className="text-xs text-red-600 hover:underline disabled:opacity-40"
                  >
                    {updating === it.variantId ? "Memproses…" : "Hapus"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <aside className="lg:col-span-1">
        <div className="sticky top-32 rounded-xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Ringkasan</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">
                {formatRupiah(cart.subtotal)}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Ongkos kirim dihitung pada halaman checkout.
            </p>
          </div>
          <button
            onClick={() => router.push("/checkout")}
            className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Checkout
          </button>
          <Link
            href="/products"
            className="mt-2 block text-center text-sm text-primary hover:underline"
          >
            Lanjut Belanja
          </Link>
        </div>
      </aside>
    </div>
  );
}

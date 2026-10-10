"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRupiah } from "@/lib/format";
import EmptyState from "@/components/EmptyState";
import AddressForm from "@/components/AddressForm";
import {
  apiError,
  type AddressData,
  type CartData,
  type CheckoutConfig,
  type ShippingService,
} from "@/lib/ui-types";

const COURIERS = [
  { value: "jne", label: "JNE" },
  { value: "jnt", label: "J&T Express" },
  { value: "sicepat", label: "SiCepat" },
  { value: "ninja", label: "Ninja Xpress" },
  { value: "tiki", label: "TIKI" },
  { value: "pos", label: "POS Indonesia" },
];

function loadSnapJs(src: string, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.snap) return resolve();
    const existing = document.querySelector(
      'script[data-snap="1"]'
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Gagal memuat Snap.js Midtrans"))
      );
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

function normalizeServices(data: unknown): ShippingService[] {
  const raw: unknown =
    (data as { services?: unknown })?.services ??
    (data as { data?: unknown })?.data ??
    data;
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const o = s as Record<string, unknown>;
    return {
      service: String(o.service ?? o.service_name ?? o.code ?? ""),
      description: String(o.description ?? o.service ?? ""),
      cost: Number(o.cost ?? o.value ?? o.price ?? 0),
      etd: String(o.etd ?? o.eta ?? o.estimate ?? "-"),
    };
  }).filter((s) => s.service && s.cost >= 0);
}

export default function CheckoutPage() {
  const { status } = useSession();
  const router = useRouter();

  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [config, setConfig] = useState<CheckoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [courier, setCourier] = useState("jne");
  const [services, setServices] = useState<ShippingService[]>([]);
  const [serviceIdx, setServiceIdx] = useState(0);
  const [costLoading, setCostLoading] = useState(false);
  const [costError, setCostError] = useState("");

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [payInfo, setPayInfo] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cartRes, addrRes, cfgRes] = await Promise.all([
        fetch("/api/cart"),
        fetch("/api/addresses"),
        fetch("/api/checkout/config"),
      ]);
      if (cartRes.status === 401 || addrRes.status === 401) {
        router.push("/login?callbackUrl=/checkout");
        return;
      }
      if (!cartRes.ok) {
        setError(await apiError(cartRes, "Gagal memuat keranjang"));
        return;
      }
      const cartData: CartData = await cartRes.json();
      setCart(cartData);
      if (addrRes.ok) {
        const a = await addrRes.json();
        const list: AddressData[] = Array.isArray(a) ? a : a.addresses ?? [];
        setAddresses(list);
        const def = list.find((x) => x.isDefault) ?? list[0];
        if (def) setSelectedAddressId(def.id);
      }
      if (cfgRes.ok) setConfig(await cfgRes.json());
    } catch {
      setError("Tidak dapat terhubung ke server. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/checkout");
      return;
    }
    if (status === "authenticated") loadAll();
  }, [status, loadAll, router]);

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
  const weightGram = (cart?.items ?? []).reduce(
    (s, it) => s + it.qty * (it.product.weight ?? 500),
    0
  );

  // Hitung ongkir saat alamat & kurir dipilih
  useEffect(() => {
    if (!selectedAddress || !cart || cart.items.length === 0) {
      setServices([]);
      return;
    }
    let cancelled = false;
    setCostLoading(true);
    setCostError("");
    fetch("/api/rajaongkir/cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destinationCityId: selectedAddress.cityId,
        destinationSubdistrictId: selectedAddress.subdistrictId || undefined,
        weightGram: Math.max(weightGram, 1),
        courier,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiError(res, "Gagal menghitung ongkir"));
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const list = normalizeServices(data);
        setServices(list);
        setServiceIdx(0);
        if (list.length === 0) setCostError("Tidak ada layanan tersedia untuk kurir ini.");
      })
      .catch((e) => {
        if (!cancelled) setCostError(e instanceof Error ? e.message : "Gagal menghitung ongkir");
      })
      .finally(() => {
        if (!cancelled) setCostLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAddressId, courier]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedService = services[serviceIdx];
  const shippingCost = selectedService?.cost ?? 0;
  const subtotal = cart?.subtotal ?? 0;
  const total = subtotal + shippingCost;

  const handlePay = async () => {
    setPayError("");
    setPayInfo("");
    if (!selectedAddress) {
      setPayError("Pilih atau tambah alamat pengiriman terlebih dahulu.");
      return;
    }
    if (!selectedService) {
      setPayError("Pilih layanan pengiriman terlebih dahulu.");
      return;
    }
    if (!config?.midtransReady) {
      setPayError(
        "Pembayaran online belum dikonfigurasi (Midtrans). Hubungi admin toko."
      );
      return;
    }
    setPaying(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addressId: selectedAddress.id,
          courier,
          courierService: selectedService.service,
          shippingCost: selectedService.cost,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayError(typeof data.error === "string" ? data.error : "Gagal membuat pesanan");
        return;
      }
      const { orderId, snapToken } = data as { orderId: string; snapToken: string };
      await loadSnapJs(config.snapJsUrl, config.clientKey);
      if (!window.snap) throw new Error("Snap.js gagal dimuat");
      window.snap.pay(snapToken, {
        onSuccess: () => router.push(`/orders/${orderId}`),
        onPending: () => router.push(`/orders/${orderId}`),
        onError: () => setPayError("Pembayaran gagal. Silakan coba lagi."),
        onClose: () =>
          setPayInfo(
            "Jendela pembayaran ditutup. Pesanan tersimpan — Anda bisa membayar lagi dari halaman Pesanan Saya."
          ),
      });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Terjadi kesalahan saat pembayaran");
    } finally {
      setPaying(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-3">
        <div className="h-40 animate-pulse rounded-xl bg-white" />
        <div className="h-40 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  if (error && !cart) {
    return (
      <EmptyState
        title="Gagal memuat checkout"
        subtitle={error}
        action={
          <button
            onClick={loadAll}
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
        title="Keranjang kosong"
        subtitle="Tambahkan produk ke keranjang sebelum checkout."
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
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Checkout</h1>

      {/* Alamat */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">📍 Alamat Pengiriman</h2>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Tambah Alamat
            </button>
          )}
        </div>
        {showForm ? (
          <AddressForm
            onSaved={(addr) => {
              setAddresses((prev) => [addr, ...prev.filter((a) => a.id !== addr.id)]);
              setSelectedAddressId(addr.id);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        ) : addresses.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada alamat tersimpan. Tambahkan alamat pengiriman untuk melanjutkan.
          </p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <label
                key={a.id}
                className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm ${
                  a.id === selectedAddressId
                    ? "border-primary bg-primary-light"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="address"
                  checked={a.id === selectedAddressId}
                  onChange={() => setSelectedAddressId(a.id)}
                  className="mt-1 accent-[#ee4d2d]"
                />
                <div>
                  <p className="font-semibold text-gray-900">
                    {a.label} — {a.recipientName}{" "}
                    <span className="font-normal text-gray-500">({a.phone})</span>
                    {a.isDefault && (
                      <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        UTAMA
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-gray-600">
                    {a.detail}, {a.subdistrict ? `${a.subdistrict}, ` : ""}
                    {a.city}, {a.province} {a.postalCode}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* Kurir & layanan */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">🚚 Kurir Pengiriman</h2>
        <div className="flex flex-wrap gap-2">
          {COURIERS.map((c) => (
            <button
              key={c.value}
              onClick={() => setCourier(c.value)}
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                courier === c.value
                  ? "border-primary bg-primary-light text-primary"
                  : "border-gray-200 text-gray-700 hover:border-gray-400"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="mt-3">
          {costLoading ? (
            <p className="text-sm text-gray-500">Menghitung ongkir…</p>
          ) : costError ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{costError}</p>
          ) : services.length > 0 ? (
            <div className="space-y-2">
              {services.map((s, i) => (
                <label
                  key={`${s.service}-${i}`}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-sm ${
                    i === serviceIdx
                      ? "border-primary bg-primary-light"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="service"
                      checked={i === serviceIdx}
                      onChange={() => setServiceIdx(i)}
                      className="accent-[#ee4d2d]"
                    />
                    <span>
                      <span className="font-semibold text-gray-900">{s.service}</span>
                      <span className="block text-xs text-gray-500">
                        {s.description} • Estimasi {s.etd} hari
                      </span>
                    </span>
                  </span>
                  <span className="font-bold text-primary">{formatRupiah(s.cost)}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Pilih alamat pengiriman untuk melihat layanan tersedia.
            </p>
          )}
        </div>
      </section>

      {/* Ringkasan */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">🧾 Ringkasan Pesanan</h2>
        <div className="space-y-3">
          {cart.items.map((it) => {
            const price = it.variant.price ?? it.product.price;
            const img = it.product.images?.[0];
            return (
              <div key={it.variantId} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt={it.product.name} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 font-medium text-gray-900">{it.product.name}</p>
                  <p className="text-xs text-gray-500">
                    {it.variant.name} × {it.qty}
                  </p>
                </div>
                <p className="font-semibold">{formatRupiah(price * it.qty)}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatRupiah(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Ongkos kirim{selectedService ? ` (${selectedService.service})` : ""}</span>
            <span>{selectedService ? formatRupiah(shippingCost) : "—"}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-bold text-gray-900">
            <span>Total Bayar</span>
            <span className="text-primary">{formatRupiah(total)}</span>
          </div>
        </div>

        {payError && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{payError}</p>
        )}
        {payInfo && (
          <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{payInfo}</p>
        )}
        <button
          onClick={handlePay}
          disabled={paying || !selectedService}
          className="mt-4 w-full rounded-lg bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {paying ? "Memproses…" : `Bayar Sekarang • ${formatRupiah(total)}`}
        </button>
        <p className="mt-2 text-center text-xs text-gray-400">
          Pembayaran aman via Midtrans (QRIS, transfer bank, e-wallet, kartu kredit).
        </p>
      </section>
    </div>
  );
}

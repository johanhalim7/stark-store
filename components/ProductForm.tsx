"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiError } from "@/lib/ui-types";

interface VariantRow {
  name: string;
  sku: string;
  price: string; // string di form, dikirim sebagai number|null
  stock: string;
}

interface CategoryOpt {
  id: string;
  name: string;
}

function normalizeList(data: unknown, key: string): unknown[] {
  if (Array.isArray(data)) return data;
  const v = (data as Record<string, unknown>)?.[key];
  return Array.isArray(v) ? v : [];
}

const emptyVariant = (): VariantRow => ({ name: "", sku: "", price: "", stock: "0" });

export default function ProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(productId);

  const [categories, setCategories] = useState<CategoryOpt[]>([]);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [price, setPrice] = useState("");
  const [compareAtPrice, setCompareAtPrice] = useState("");
  const [weight, setWeight] = useState("500");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([emptyVariant()]);

  const [loadingData, setLoadingData] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/categories")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        const list = normalizeList(data, "categories");
        setCategories(
          list.map((c) => {
            const o = c as Record<string, unknown>;
            return { id: String(o.id), name: String(o.name) };
          })
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!productId) return;
    fetch(`/api/admin/products/${productId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await apiError(res, "Gagal memuat produk"));
        const data = await res.json();
        const p = (data.product ?? data) as Record<string, unknown>;
        setName(String(p.name ?? ""));
        setCategoryId(String(p.categoryId ?? ""));
        setPrice(String(p.price ?? ""));
        setCompareAtPrice(p.compareAtPrice != null ? String(p.compareAtPrice) : "");
        setWeight(String(p.weight ?? "500"));
        setSku(String(p.sku ?? ""));
        setDescription(String(p.description ?? ""));
        setIsActive(p.isActive !== false);
        setImages(Array.isArray(p.images) ? (p.images as string[]) : []);
        const vs = Array.isArray(p.variants) ? (p.variants as Record<string, unknown>[]) : [];
        setVariants(
          vs.length
            ? vs.map((v) => ({
                name: String(v.name ?? ""),
                sku: String(v.sku ?? ""),
                price: v.price != null ? String(v.price) : "",
                stock: String(v.stock ?? "0"),
              }))
            : [emptyVariant()]
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat produk"))
      .finally(() => setLoadingData(false));
  }, [productId]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        if (!res.ok) throw new Error(await apiError(res, `Gagal mengunggah ${file.name}`));
        const data = await res.json();
        const url = (data as { url?: string }).url;
        if (!url) throw new Error("Respons upload tidak berisi URL");
        setImages((prev) => [...prev, url]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengunggah gambar");
    } finally {
      setUploading(false);
    }
  };

  const updateVariant = (i: number, patch: Partial<VariantRow>) => {
    setVariants((prev) => prev.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Nama produk wajib diisi.");
      return;
    }
    if (!price || Number(price) < 0) {
      setError("Harga produk tidak valid.");
      return;
    }
    const cleanVariants = variants
      .filter((v) => v.name.trim() !== "")
      .map((v) => ({
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        price: v.price === "" ? null : Number(v.price),
        stock: Math.max(0, parseInt(v.stock || "0", 10) || 0),
      }));
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        categoryId: categoryId || null,
        price: Number(price),
        compareAtPrice: compareAtPrice === "" ? null : Number(compareAtPrice),
        weight: Math.max(1, parseInt(weight || "500", 10) || 500),
        sku: sku.trim() || null,
        description,
        isActive,
        images,
        variants: cleanVariants,
      };
      const url = isEdit ? `/api/admin/products/${productId}` : "/api/admin/products";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal menyimpan produk"));
        return;
      }
      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
  const labelCls = "mb-1 block text-xs font-medium text-gray-600";

  if (loadingData) {
    return (
      <div className="space-y-3">
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {isEdit ? "Ubah Produk" : "Tambah Produk"}
      </h1>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900">Informasi Dasar</h2>
            <div>
              <label className={labelCls}>Nama Produk *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="Contoh: Kaos Polos Premium" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Kategori</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputCls}>
                  <option value="">— Tanpa Kategori —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>SKU</label>
                <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputCls} placeholder="Opsional" />
              </div>
              <div>
                <label className={labelCls}>Harga (Rp) *</label>
                <input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} required className={inputCls} placeholder="50000" />
              </div>
              <div>
                <label className={labelCls}>Harga Coret (Rp)</label>
                <input type="number" min={0} value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} className={inputCls} placeholder="Opsional, mis. 75000" />
              </div>
              <div>
                <label className={labelCls}>Berat (gram) *</label>
                <input type="number" min={1} value={weight} onChange={(e) => setWeight(e.target.value)} required className={inputCls} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#ee4d2d]" />
                  Produk aktif (tampil di toko)
                </label>
              </div>
            </div>
            <div>
              <label className={labelCls}>Deskripsi</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputCls} placeholder="Deskripsikan produk secara detail…" />
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Varian</h2>
              <button type="button" onClick={() => setVariants((p) => [...p, emptyVariant()])} className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-light">
                + Tambah Varian
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Kosongkan semua baris varian bila produk hanya punya satu tipe — server akan
              membuatkan varian &quot;Standar&quot; otomatis.
            </p>
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-100 p-3 sm:grid-cols-5">
                <input value={v.name} onChange={(e) => updateVariant(i, { name: e.target.value })} className={inputCls} placeholder="Nama varian (mis. Merah / L)" />
                <input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className={inputCls} placeholder="SKU varian" />
                <input type="number" min={0} value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} className={inputCls} placeholder="Harga (kosong = ikut produk)" />
                <input type="number" min={0} value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} className={inputCls} placeholder="Stok" />
                <button type="button" onClick={() => setVariants((p) => p.filter((_, j) => j !== i))} disabled={variants.length === 1} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 sm:col-span-1">
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-white p-5 shadow-sm space-y-3">
            <h2 className="font-bold text-gray-900">Foto Produk</h2>
            <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-200 p-4 text-center text-sm text-gray-500 hover:border-primary hover:text-primary">
              {uploading ? "Mengunggah…" : "📤 Klik untuk pilih foto (bisa banyak)"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
            </label>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((src, i) => (
                  <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setImages((p) => p.filter((_, j) => j !== i))} aria-label="Hapus foto" className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80">
                      ✕
                    </button>
                    {i === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                        UTAMA
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => router.push("/admin/products")} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Batal
            </button>
            <button type="submit" disabled={saving || uploading} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
              {saving ? "Menyimpan…" : isEdit ? "Simpan Perubahan" : "Buat Produk"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiError } from "@/lib/ui-types";

interface Category {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  description: string | null;
  sortOrder: number;
  _count?: { products: number };
}

function normalizeList(data: unknown): Category[] {
  if (Array.isArray(data)) return data as Category[];
  const v = (data as { categories?: unknown })?.categories;
  return Array.isArray(v) ? (v as Category[]) : [];
}

export default function AdminCategoriesPage() {
  const [list, setList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // form tambah
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // edit inline
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat kategori"));
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

  const upload = async (files: FileList | null, setter: (url: string) => void) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await apiError(res, "Gagal mengunggah gambar"));
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Respons upload tidak berisi URL");
      setter(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          image: image || null,
          sortOrder: parseInt(sortOrder || "0", 10) || 0,
        }),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal menambah kategori"));
        return;
      }
      setName("");
      setDescription("");
      setImage("");
      setSortOrder("0");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSort(String(c.sortOrder));
  };

  const saveEdit = async (c: Category) => {
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), sortOrder: parseInt(editSort || "0", 10) || 0 }),
      });
      if (!res.ok) {
        alert(await apiError(res, "Gagal menyimpan"));
        return;
      }
      setEditingId(null);
      await load();
    } catch {
      alert("Tidak dapat terhubung ke server.");
    }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Hapus kategori "${c.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/categories/${c.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(await apiError(res, "Gagal menghapus kategori"));
        return;
      }
      await load();
    } catch {
      alert("Tidak dapat terhubung ke server.");
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Kategori</h1>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={add} className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">+ Tambah Kategori</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Nama kategori *" required />
          <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Deskripsi (opsional)" />
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} placeholder="Urutan" />
          <label className="block cursor-pointer rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center text-sm text-gray-500 hover:border-primary">
            {uploading ? "Mengunggah…" : image ? "✓ Gambar dipilih" : "Pilih gambar (opsional)"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files, setImage)} disabled={uploading} />
          </label>
        </div>
        <button type="submit" disabled={saving || uploading} className="mt-3 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {saving ? "Menyimpan…" : "Tambah Kategori"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400">
              <th className="px-4 py-3 font-medium">Kategori</th>
              <th className="px-4 py-3 font-medium">Urutan</th>
              <th className="px-4 py-3 font-medium">Produk</th>
              <th className="px-4 py-3 text-right font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">Memuat…</td>
              </tr>
            ) : (
              list.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {c.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-gray-300">🏷️</div>
                        )}
                      </div>
                      {editingId === c.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                      ) : (
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">/{c.slug}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {editingId === c.id ? (
                      <input type="number" value={editSort} onChange={(e) => setEditSort(e.target.value)} className={`${inputCls} w-20`} />
                    ) : (
                      c.sortOrder
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c._count?.products ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {editingId === c.id ? (
                        <>
                          <button onClick={() => saveEdit(c)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white">Simpan</button>
                          <button onClick={() => setEditingId(null)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600">Batal</button>
                        </>
                      ) : (
                        <button onClick={() => startEdit(c)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Ubah</button>
                      )}
                      <button onClick={() => remove(c)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Hapus</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            {!loading && list.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-500">Belum ada kategori.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { apiError } from "@/lib/ui-types";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
}

function normalizeList(data: unknown): Banner[] {
  if (Array.isArray(data)) return data as Banner[];
  const v = (data as { banners?: unknown })?.banners;
  return Array.isArray(v) ? (v as Banner[]) : [];
}

export default function AdminBannersPage() {
  const [list, setList] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Banner | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/banners");
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat banner"));
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

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setImage("");
    setLink("");
    setSortOrder("0");
    setIsActive(true);
    setEditing(null);
  };

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", files[0]);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await apiError(res, "Gagal mengunggah gambar"));
      const data = (await res.json()) as { url?: string };
      if (!data.url) throw new Error("Respons upload tidak berisi URL");
      setImage(data.url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal mengunggah");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Judul banner wajib diisi.");
      return;
    }
    if (!image) {
      setError("Gambar banner wajib diunggah.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image,
        link: link.trim() || null,
        sortOrder: parseInt(sortOrder || "0", 10) || 0,
        isActive,
      };
      const url = editing ? `/api/admin/banners/${editing.id}` : "/api/admin/banners";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal menyimpan banner"));
        return;
      }
      resetForm();
      await load();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (b: Banner) => {
    setEditing(b);
    setTitle(b.title);
    setSubtitle(b.subtitle ?? "");
    setImage(b.image);
    setLink(b.link ?? "");
    setSortOrder(String(b.sortOrder));
    setIsActive(b.isActive);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (b: Banner) => {
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      if (!res.ok) {
        alert(await apiError(res, "Gagal mengubah status"));
        return;
      }
      await load();
    } catch {
      alert("Tidak dapat terhubung ke server.");
    }
  };

  const remove = async (b: Banner) => {
    if (!confirm(`Hapus banner "${b.title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/banners/${b.id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(await apiError(res, "Gagal menghapus banner"));
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
      <h1 className="text-xl font-bold text-gray-900">Banner</h1>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <form onSubmit={submit} className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">
          {editing ? "Ubah Banner" : "+ Tambah Banner"}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="Judul banner *" required />
          <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className={inputCls} placeholder="Subjudul (opsional)" />
          <input value={link} onChange={(e) => setLink(e.target.value)} className={inputCls} placeholder="Link tujuan, mis. /products (opsional)" />
          <input type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className={inputCls} placeholder="Urutan tampil" />
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-500 hover:border-primary sm:w-64">
            {uploading ? "Mengunggah…" : image ? "✓ Gambar terpilih — ganti?" : "📤 Unggah gambar banner *"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files)} disabled={uploading} />
          </label>
          {image && (
            <div className="h-20 w-40 overflow-hidden rounded-lg bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Pratinjau banner" className="h-full w-full object-cover" />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[#ee4d2d]" />
            Aktif (tampil di beranda)
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {editing && (
            <button type="button" onClick={resetForm} className="rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Batal
            </button>
          )}
          <button type="submit" disabled={saving || uploading} className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
            {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Banner"}
          </button>
        </div>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-gray-400">Memuat…</p>
        ) : list.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada banner.</p>
        ) : (
          list.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-xl bg-white shadow-sm">
              <div className="aspect-[16/6] w-full bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.title} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 font-semibold text-gray-900">{b.title}</p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${b.isActive ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"}`}>
                    {b.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                {b.subtitle && <p className="line-clamp-1 text-xs text-gray-500">{b.subtitle}</p>}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => startEdit(b)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">Ubah</button>
                  <button onClick={() => toggleActive(b)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
                    {b.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button onClick={() => remove(b)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">Hapus</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

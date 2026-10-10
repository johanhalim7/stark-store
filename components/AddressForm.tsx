"use client";

import { useEffect, useState } from "react";
import { apiError, type AddressData, type RegionItem } from "@/lib/ui-types";

function normalizeRegions(data: unknown): RegionItem[] {
  const raw: unknown =
    (data as { provinces?: unknown })?.provinces ??
    (data as { cities?: unknown })?.cities ??
    (data as { subdistricts?: unknown })?.subdistricts ??
    (data as { data?: unknown })?.data ??
    data;
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    return {
      id: String(o.id ?? o.province_id ?? o.city_id ?? o.subdistrict_id ?? ""),
      name: String(o.name ?? o.province_name ?? o.city_name ?? o.subdistrict_name ?? ""),
    };
  }).filter((r) => r.id && r.name);
}

async function fetchRegions(url: string): Promise<RegionItem[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await apiError(res, "Gagal memuat wilayah"));
  return normalizeRegions(await res.json());
}

export default function AddressForm({
  initial,
  onSaved,
  onCancel,
}: {
  initial?: AddressData | null;
  onSaved: (addr: AddressData) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "Rumah");
  const [recipientName, setRecipientName] = useState(initial?.recipientName ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? "");
  const [cityId, setCityId] = useState(initial?.cityId ?? "");
  const [subdistrictId, setSubdistrictId] = useState(initial?.subdistrictId ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [detail, setDetail] = useState(initial?.detail ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);

  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [cities, setCities] = useState<RegionItem[]>([]);
  const [subdistricts, setSubdistricts] = useState<RegionItem[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRegions("/api/rajaongkir/provinces")
      .then(setProvinces)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat provinsi"));
  }, []);

  useEffect(() => {
    if (!provinceId) {
      setCities([]);
      setCityId("");
      return;
    }
    setLoadingRegions(true);
    fetchRegions(`/api/rajaongkir/cities?province=${encodeURIComponent(provinceId)}`)
      .then((list) => {
        setCities(list);
        if (initial?.cityId && list.some((c) => c.id === initial.cityId)) {
          setCityId(initial.cityId);
        } else if (!list.some((c) => c.id === cityId)) {
          setCityId("");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat kota"))
      .finally(() => setLoadingRegions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provinceId]);

  useEffect(() => {
    if (!cityId) {
      setSubdistricts([]);
      setSubdistrictId("");
      return;
    }
    setLoadingRegions(true);
    fetchRegions(`/api/rajaongkir/subdistricts?city=${encodeURIComponent(cityId)}`)
      .then((list) => {
        setSubdistricts(list);
        if (initial?.subdistrictId && list.some((s) => s.id === initial.subdistrictId)) {
          setSubdistrictId(initial.subdistrictId);
        } else if (!list.some((s) => s.id === subdistrictId)) {
          setSubdistrictId("");
        }
      })
      .catch(() => setSubdistricts([]))
      .finally(() => setLoadingRegions(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityId]);

  const provinceName = provinces.find((p) => p.id === provinceId)?.name ?? "";
  const cityName = cities.find((c) => c.id === cityId)?.name ?? "";
  const subdistrictName = subdistricts.find((s) => s.id === subdistrictId)?.name ?? "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!provinceId || !cityId) {
      setError("Pilih provinsi dan kota/kabupaten terlebih dahulu.");
      return;
    }
    setSaving(true);
    try {
      const body = {
        label,
        recipientName,
        phone,
        provinceId,
        province: provinceName,
        cityId,
        city: cityName,
        subdistrictId: subdistrictId || null,
        subdistrict: subdistrictName || null,
        postalCode,
        detail,
        isDefault,
      };
      const url = initial ? `/api/addresses/${initial.id}` : "/api/addresses";
      const res = await fetch(url, {
        method: initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(await apiError(res, "Gagal menyimpan alamat"));
        return;
      }
      const data = await res.json();
      const saved: AddressData = data.address ?? data;
      onSaved(saved);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

  return (
    <form onSubmit={submit} className="space-y-3 rounded-xl bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-gray-900">
        {initial ? "Ubah Alamat" : "Tambah Alamat Baru"}
      </h3>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Label</label>
          <select value={label} onChange={(e) => setLabel(e.target.value)} className={inputCls}>
            <option value="Rumah">Rumah</option>
            <option value="Kantor">Kantor</option>
            <option value="Kos">Kos</option>
            <option value="Lainnya">Lainnya</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Nama Penerima</label>
          <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} required className={inputCls} placeholder="Nama lengkap" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">No. HP</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} required className={inputCls} placeholder="08xxxxxxxxxx" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Kode Pos</label>
          <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required className={inputCls} placeholder="12345" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Provinsi</label>
          <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} required className={inputCls}>
            <option value="">— Pilih Provinsi —</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Kota / Kabupaten</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} required disabled={!provinceId || loadingRegions} className={inputCls}>
            <option value="">— Pilih Kota —</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Kecamatan <span className="text-gray-400">(opsional)</span>
          </label>
          <select value={subdistrictId} onChange={(e) => setSubdistrictId(e.target.value)} disabled={!cityId} className={inputCls}>
            <option value="">— Pilih Kecamatan —</option>
            {subdistricts.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">
            Alamat Lengkap (jalan, nomor rumah, patokan)
          </label>
          <textarea value={detail} onChange={(e) => setDetail(e.target.value)} required rows={2} className={inputCls} placeholder="Jl. Contoh No. 123, RT/RW…" />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-[#ee4d2d]" />
        Jadikan alamat utama
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Batal
        </button>
        <button type="submit" disabled={saving} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50">
          {saving ? "Menyimpan…" : "Simpan Alamat"}
        </button>
      </div>
    </form>
  );
}

/**
 * Client RajaOngkir (Starter API).
 * Semua fungsi graceful: bila RAJAONGKIR_API_KEY kosong, throw Error
 * dengan pesan jelas (ditangkap API route -> 503 + pesan untuk UI).
 */

const API_KEY = () => process.env.RAJAONGKIR_API_KEY || "";
const BASE = "https://api.rajaongkir.com/starter";

export function rajaongkirConfigured(): boolean {
  return Boolean(process.env.RAJAONGKIR_API_KEY);
}

function needKey(): void {
  if (!rajaongkirConfigured()) {
    throw new Error(
      "RAJAONGKIR_API_KEY belum diisi. Isi di .env lalu restart server."
    );
  }
}

async function getJSON(path: string) {
  needKey();
  const res = await fetch(`${BASE}${path}`, {
    headers: { key: API_KEY()! },
    next: { revalidate: 86400 }, // wilayah jarang berubah -> cache 24 jam
  });
  if (!res.ok) throw new Error(`RajaOngkir error ${res.status}`);
  const data = await res.json();
  const results = data?.rajaongkir?.results;
  if (!results) throw new Error("Respons RajaOngkir tidak valid");
  return results;
}

export interface Province { province_id: string; province: string }
export interface City { city_id: string; city_name: string; postal_code: string }
export interface Subdistrict { subdistrict_id: string; subdistrict_name: string }

export async function getProvinces(): Promise<Province[]> {
  return getJSON("/province");
}

export async function getCities(provinceId: string): Promise<City[]> {
  return getJSON(`/city?province=${encodeURIComponent(provinceId)}`);
}

export async function getSubdistricts(cityId: string): Promise<Subdistrict[]> {
  return getJSON(`/subdistrict?city=${encodeURIComponent(cityId)}`);
}

export interface ShippingCost {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
}

/** Hitung ongkir via POST /cost. origin = ID kota asal toko (RAJAONGKIR_ORIGIN_CITY_ID). */
export async function getShippingCost(opts: {
  destinationCityId: string;
  destinationSubdistrictId?: string;
  weightGram: number;
  courier: string; // "jne", "jnt", "sicepat", ...
}): Promise<ShippingCost[]> {
  needKey();
  const origin = process.env.RAJAONGKIR_ORIGIN_CITY_ID;
  if (!origin) {
    throw new Error(
      "RAJAONGKIR_ORIGIN_CITY_ID belum diisi (ID kota asal toko)."
    );
  }
  const body = new URLSearchParams({
    origin,
    originType: "city",
    destination: opts.destinationSubdistrictId || opts.destinationCityId,
    destinationType: opts.destinationSubdistrictId ? "subdistrict" : "city",
    weight: String(Math.max(1, Math.round(opts.weightGram))),
    courier: opts.courier,
  });
  const res = await fetch(`${BASE}/cost`, {
    method: "POST",
    headers: { key: API_KEY()!, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`RajaOngkir error ${res.status}`);
  const data = await res.json();
  const results = data?.rajaongkir?.results?.[0]?.costs;
  if (!results) return [];
  return results.map(
    (c: { service: string; description: string; cost: { value: number; etd: string }[] }) => ({
      courier: opts.courier,
      service: c.service,
      description: c.description,
      cost: c.cost?.[0]?.value ?? 0,
      etd: c.cost?.[0]?.etd ?? "",
    })
  );
}

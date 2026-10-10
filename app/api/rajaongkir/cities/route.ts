export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getCities } from "@/lib/rajaongkir";

export async function GET(req: Request) {
  const provinceId = new URL(req.url).searchParams.get("province") || "";
  if (!provinceId) {
    return NextResponse.json(
      { error: "Parameter province wajib diisi." },
      { status: 400 }
    );
  }
  try {
    const cities = await getCities(provinceId);
    return NextResponse.json({ cities });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat kota.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

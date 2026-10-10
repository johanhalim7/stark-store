export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getSubdistricts } from "@/lib/rajaongkir";

export async function GET(req: Request) {
  const cityId = new URL(req.url).searchParams.get("city") || "";
  if (!cityId) {
    return NextResponse.json(
      { error: "Parameter city wajib diisi." },
      { status: 400 }
    );
  }
  try {
    const subdistricts = await getSubdistricts(cityId);
    return NextResponse.json({ subdistricts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat kecamatan.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getProvinces } from "@/lib/rajaongkir";
import { serverError } from "@/lib/api";

export async function GET() {
  try {
    const provinces = await getProvinces();
    return NextResponse.json({ provinces });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal memuat provinsi.";
    // lib melempar Error ramah bila key belum diisi -> 503
    if (/belum diisi/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 503 });
    }
    return msg ? NextResponse.json({ error: msg }, { status: 503 }) : serverError(null);
  }
}

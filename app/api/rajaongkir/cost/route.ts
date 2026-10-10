export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { getShippingCost } from "@/lib/rajaongkir";
import { parseJsonBody } from "@/lib/api";

const costSchema = z.object({
  destinationCityId: z.string({ error: "Kota tujuan wajib diisi." }).min(1),
  destinationSubdistrictId: z.string().optional().nullable(),
  weightGram: z
    .number({ error: "Berat tidak valid." })
    .int("Berat tidak valid.")
    .min(1, "Berat minimal 1 gram."),
  courier: z.string({ error: "Kurir wajib dipilih." }).trim().min(1, "Kurir wajib dipilih."),
});

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req, costSchema);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  try {
    const services = await getShippingCost({
      destinationCityId: parsed.data.destinationCityId,
      destinationSubdistrictId: parsed.data.destinationSubdistrictId ?? undefined,
      weightGram: parsed.data.weightGram,
      courier: parsed.data.courier,
    });
    return NextResponse.json({ services });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Gagal menghitung ongkir.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

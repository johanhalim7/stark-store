export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";

export const addressSchema = z.object({
  label: z.string({ error: "Label wajib diisi." }).trim().min(1, "Label wajib diisi.").max(50),
  recipientName: z.string({ error: "Nama penerima wajib diisi." }).trim().min(1, "Nama penerima wajib diisi.").max(100),
  phone: z.string({ error: "Nomor HP wajib diisi." }).trim().min(7, "Nomor HP tidak valid.").max(20),
  provinceId: z.string({ error: "Provinsi wajib dipilih." }).min(1, "Provinsi wajib dipilih."),
  province: z.string({ error: "Provinsi wajib dipilih." }).trim().min(1).max(100),
  cityId: z.string({ error: "Kota wajib dipilih." }).min(1, "Kota wajib dipilih."),
  city: z.string({ error: "Kota wajib dipilih." }).trim().min(1).max(100),
  subdistrictId: z.string().optional().nullable(),
  subdistrict: z.string().max(100).optional().nullable(),
  postalCode: z.string({ error: "Kode pos wajib diisi." }).trim().min(3, "Kode pos tidak valid.").max(10),
  detail: z.string({ error: "Detail alamat wajib diisi." }).trim().min(5, "Detail alamat terlalu pendek.").max(500),
  isDefault: z.boolean().optional().default(false),
});

export async function GET() {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const addresses = await db.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ addresses });
  } catch {
    return serverError(null);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const parsed = await parseJsonBody(req, addressSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    const address = await db.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.create({
        data: { ...data, userId: user.id },
      });
    });

    return NextResponse.json({ ok: true, address }, { status: 201 });
  } catch {
    return serverError(null);
  }
}

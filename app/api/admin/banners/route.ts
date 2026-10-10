export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";

export const bannerInputSchema = z.object({
  title: z.string({ error: "Judul banner wajib diisi." }).trim().min(1, "Judul banner wajib diisi.").max(200),
  subtitle: z.string().max(500).optional().nullable(),
  image: z.string({ error: "Gambar banner wajib diisi." }).trim().min(1, "Gambar banner wajib diisi.").max(500),
  link: z.string().max(500).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const banners = await db.banner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ banners });
  } catch {
    return serverError(null);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const parsed = await parseJsonBody(req, bannerInputSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    const banner = await db.banner.create({
      data: {
        title: data.title,
        subtitle: data.subtitle ?? null,
        image: data.image,
        link: data.link ?? null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    return NextResponse.json({ ok: true, banner }, { status: 201 });
  } catch {
    return serverError(null);
  }
}

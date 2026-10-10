export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { slugify } from "@/lib/format";

export const categoryInputSchema = z.object({
  name: z.string({ error: "Nama kategori wajib diisi." }).trim().min(2, "Nama kategori minimal 2 karakter.").max(100),
  slug: z.string().trim().max(200).optional(),
  image: z.string().max(500).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const categories = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categories });
  } catch {
    return serverError(null);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const parsed = await parseJsonBody(req, categoryInputSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    let slug = data.slug || slugify(data.name);
    let n = 2;
    while (await db.category.findUnique({ where: { slug }, select: { id: true } })) {
      slug = `${data.slug || slugify(data.name)}-${n++}`;
    }

    try {
      const category = await db.category.create({
        data: {
          name: data.name,
          slug,
          image: data.image ?? null,
          description: data.description ?? null,
          sortOrder: data.sortOrder,
        },
      });
      return NextResponse.json({ ok: true, category }, { status: 201 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Slug kategori sudah dipakai." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch {
    return serverError(null);
  }
}

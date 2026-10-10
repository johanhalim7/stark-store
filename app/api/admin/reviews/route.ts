export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";

const patchSchema = z.object({
  id: z.string({ error: "ID ulasan wajib diisi." }).min(1),
  isHidden: z.boolean({ error: "isHidden harus boolean." }),
});

export async function GET(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const page = Math.max(1, Number(new URL(req.url).searchParams.get("page")) || 1);
    const perPage = 20;

    const [total, reviews] = await Promise.all([
      db.review.count(),
      db.review.findMany({
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          product: { select: { id: true, name: true } },
          user: { select: { id: true, name: true, email: true } },
        },
      }),
    ]);

    return NextResponse.json({ reviews, total, page, perPage });
  } catch {
    return serverError(null);
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }

    const result = await db.review.updateMany({
      where: { id: parsed.data.id },
      data: { isHidden: parsed.data.isHidden },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Ulasan tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return serverError(null);
  }
}

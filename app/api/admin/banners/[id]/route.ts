export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { bannerInputSchema } from "../route";

const patchSchema = bannerInputSchema.partial();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    try {
      const banner = await db.banner.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.subtitle !== undefined ? { subtitle: data.subtitle } : {}),
          ...(data.image !== undefined ? { image: data.image } : {}),
          ...(data.link !== undefined ? { link: data.link } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
      return NextResponse.json({ ok: true, banner });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });
      }
      throw err;
    }
  } catch {
    return serverError(null);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    try {
      await db.banner.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json({ error: "Banner tidak ditemukan." }, { status: 404 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return serverError(null);
  }
}

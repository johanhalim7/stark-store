export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { categoryInputSchema } from "../route";

const patchSchema = categoryInputSchema.partial();

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
      const category = await db.category.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(data.image !== undefined ? { image: data.image } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        },
      });
      return NextResponse.json({ ok: true, category });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
      }
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    const productCount = await db.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      return NextResponse.json(
        {
          error: `Kategori tidak bisa dihapus karena masih memiliki ${productCount} produk.`,
        },
        { status: 400 }
      );
    }

    try {
      await db.category.delete({ where: { id } });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2025"
      ) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
      }
      throw err;
    }
    return NextResponse.json({ ok: true });
  } catch {
    return serverError(null);
  }
}

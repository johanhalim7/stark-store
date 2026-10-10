export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { productInputSchema, variantInputSchema } from "../route";

const patchSchema = productInputSchema.partial().extend({
  variants: variantInputSchema.array().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { name: "asc" } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ product });
  } catch {
    return serverError(null);
  }
}

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

    const existing = await db.product.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }

    if (data.categoryId !== undefined && data.categoryId !== null) {
      const cat = await db.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
      }
    }

    try {
      const product = await db.$transaction(async (tx) => {
        // 1) Update field produk (tanpa variants)
        const { variants, ...productFields } = data;
        await tx.product.update({
          where: { id },
          data: {
            ...(productFields.name !== undefined ? { name: productFields.name } : {}),
            ...(productFields.slug !== undefined ? { slug: productFields.slug } : {}),
            ...(productFields.description !== undefined
              ? { description: productFields.description }
              : {}),
            ...(productFields.price !== undefined ? { price: productFields.price } : {}),
            ...(productFields.compareAtPrice !== undefined
              ? { compareAtPrice: productFields.compareAtPrice }
              : {}),
            ...(productFields.images !== undefined ? { images: productFields.images } : {}),
            ...(productFields.weight !== undefined ? { weight: productFields.weight } : {}),
            ...(productFields.sku !== undefined ? { sku: productFields.sku } : {}),
            ...(productFields.categoryId !== undefined
              ? { categoryId: productFields.categoryId }
              : {}),
            ...(productFields.isActive !== undefined
              ? { isActive: productFields.isActive }
              : {}),
          },
        });

        // 2) Replace penuh varian bila payload menyertakan variants
        if (variants !== undefined) {
          const current = await tx.productVariant.findMany({
            where: { productId: id },
            select: { id: true },
          });
          const payloadIds = new Set(
            variants.filter((v) => v.id).map((v) => v.id as string)
          );
          for (const c of current) {
            if (!payloadIds.has(c.id)) {
              const used = await tx.orderItem.count({ where: { variantId: c.id } });
              if (used > 0) {
                // dipakai order -> nonaktifkan saja, jangan hapus
                await tx.productVariant.update({
                  where: { id: c.id },
                  data: { isActive: false },
                });
              } else {
                await tx.productVariant.delete({ where: { id: c.id } });
              }
            }
          }
          for (const v of variants) {
            if (v.id) {
              await tx.productVariant.updateMany({
                where: { id: v.id, productId: id },
                data: {
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price ?? null,
                  stock: v.stock,
                },
              });
            } else {
              await tx.productVariant.create({
                data: {
                  productId: id,
                  name: v.name,
                  sku: v.sku ?? null,
                  price: v.price ?? null,
                  stock: v.stock,
                },
              });
            }
          }
        }

        return tx.product.findUnique({
          where: { id },
          include: { variants: { orderBy: { name: "asc" } } },
        });
      });

      return NextResponse.json({ ok: true, product });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Slug atau nama varian sudah dipakai." },
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

    const result = await db.product.updateMany({
      where: { id },
      data: { isActive: false },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Produk tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return serverError(null);
  }
}

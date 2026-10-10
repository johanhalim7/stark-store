export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireAdmin, serverError } from "@/lib/api";
import { slugify } from "@/lib/format";

export const variantInputSchema = z.object({
  id: z.string().optional(),
  name: z.string({ error: "Nama varian wajib diisi." }).trim().min(1, "Nama varian wajib diisi.").max(100),
  sku: z.string().max(100).optional().nullable(),
  price: z.number().int().min(0, "Harga varian tidak boleh negatif.").optional().nullable(),
  stock: z.number().int().min(0, "Stok tidak boleh negatif.").default(0),
});

export const productInputSchema = z.object({
  name: z.string({ error: "Nama produk wajib diisi." }).trim().min(3, "Nama produk minimal 3 karakter.").max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string({ error: "Deskripsi wajib diisi." }).trim().min(1, "Deskripsi wajib diisi."),
  price: z.number({ error: "Harga wajib diisi." }).int("Harga harus bilangan bulat.").min(0, "Harga tidak boleh negatif."),
  compareAtPrice: z.number().int().min(0).optional().nullable(),
  images: z.array(z.string()).default([]),
  weight: z.number({ error: "Berat wajib diisi." }).int("Berat harus bilangan bulat.").min(1, "Berat minimal 1 gram."),
  sku: z.string().max(100).optional().nullable(),
  categoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  stock: z.number().int().min(0).optional(),
  variants: z.array(variantInputSchema).default([]),
});

export async function GET() {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { name: "asc" } },
      },
    });
    return NextResponse.json({ products });
  } catch {
    return serverError(null);
  }
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

export async function POST(req: Request) {
  try {
    const guard = await requireAdmin();
    if ("res" in guard) return guard.res;

    const parsed = await parseJsonBody(req, productInputSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    if (data.categoryId) {
      const cat = await db.category.findUnique({
        where: { id: data.categoryId },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
      }
    }

    const slug = await uniqueSlug(data.slug || slugify(data.name));

    const variantsToCreate =
      data.variants.length > 0
        ? data.variants
        : [{ name: "Standar", sku: null, price: null, stock: data.stock ?? 0 }];

    try {
      const product = await db.product.create({
        data: {
          name: data.name,
          slug,
          description: data.description,
          price: data.price,
          compareAtPrice: data.compareAtPrice ?? null,
          images: data.images,
          weight: data.weight,
          sku: data.sku ?? null,
          categoryId: data.categoryId ?? null,
          isActive: data.isActive,
          variants: {
            create: variantsToCreate.map((v) => ({
              name: v.name,
              sku: v.sku ?? null,
              price: v.price ?? null,
              stock: v.stock,
            })),
          },
        },
        include: { variants: true },
      });
      return NextResponse.json({ ok: true, product }, { status: 201 });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "Nama varian sudah dipakai untuk produk ini." },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch {
    return serverError(null);
  }
}

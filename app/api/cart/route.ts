export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";

const cartItemSchema = z.object({
  variantId: z.string({ error: "variantId wajib diisi." }).min(1, "variantId wajib diisi."),
  qty: z
    .number({ error: "Jumlah harus berupa angka." })
    .int("Jumlah harus bilangan bulat.")
    .min(0, "Jumlah tidak boleh negatif."),
});

function unitPrice(variant: { price: number | null }, product: { price: number }) {
  return variant.price ?? product.price;
}

/** Bentuk cart penuh yang dipakai UI ({items, subtotal}). */
async function getCart(userId: string) {
  const items = await db.cartItem.findMany({
    where: { userId },
    include: {
      product: {
        select: { id: true, name: true, slug: true, images: true, price: true, weight: true, isActive: true },
      },
      variant: { select: { id: true, name: true, price: true, stock: true, isActive: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const mapped = items.map((i) => ({
    variantId: i.variantId,
    qty: i.qty,
    product: {
      id: i.product.id,
      name: i.product.name,
      slug: i.product.slug,
      images: i.product.images,
      price: unitPrice(i.variant, i.product),
      weight: i.product.weight,
      isActive: i.product.isActive,
    },
    variant: i.variant,
  }));
  const subtotal = mapped.reduce((s, i) => s + i.product.price * i.qty, 0);
  return { items: mapped, subtotal };
}

export async function GET() {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    return NextResponse.json(await getCart(user.id));
  } catch {
    return serverError(null);
  }
}

export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const parsed = await parseJsonBody(req, cartItemSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { variantId, qty } = parsed.data;
    if (qty === 0) {
      return NextResponse.json(
        { error: "Jumlah minimal 1. Gunakan qty 0 pada ubah jumlah untuk menghapus." },
        { status: 400 }
      );
    }

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { id: true, isActive: true, name: true } } },
    });
    if (!variant || !variant.product.isActive || !variant.isActive) {
      return NextResponse.json(
        { error: "Produk atau varian tidak tersedia." },
        { status: 404 }
      );
    }

    const existing = await db.cartItem.findUnique({
      where: { userId_variantId: { userId: user.id, variantId } },
      select: { qty: true },
    });
    const newQty = (existing?.qty ?? 0) + qty;
    if (newQty > variant.stock) {
      return NextResponse.json(
        {
          error: `Stok "${variant.product.name} (${variant.name})" tidak mencukupi. Tersisa ${variant.stock}.`,
        },
        { status: 400 }
      );
    }

    await db.cartItem.upsert({
      where: { userId_variantId: { userId: user.id, variantId } },
      create: {
        userId: user.id,
        productId: variant.product.id,
        variantId,
        qty: newQty,
      },
      update: { qty: newQty },
    });

    return NextResponse.json(await getCart(user.id));
  } catch {
    return serverError(null);
  }
}

export async function PATCH(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const parsed = await parseJsonBody(req, cartItemSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { variantId, qty } = parsed.data;

    const existing = await db.cartItem.findUnique({
      where: { userId_variantId: { userId: user.id, variantId } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Item tidak ditemukan di keranjang." },
        { status: 404 }
      );
    }

    if (qty === 0) {
      await db.cartItem.delete({
        where: { userId_variantId: { userId: user.id, variantId } },
      });
      return NextResponse.json(await getCart(user.id));
    }

    const variant = await db.productVariant.findUnique({
      where: { id: variantId },
      include: { product: { select: { isActive: true, name: true } } },
    });
    if (!variant || !variant.product.isActive || !variant.isActive) {
      return NextResponse.json(
        { error: "Produk atau varian tidak tersedia." },
        { status: 404 }
      );
    }
    if (qty > variant.stock) {
      return NextResponse.json(
        {
          error: `Stok "${variant.product.name} (${variant.name})" tidak mencukupi. Tersisa ${variant.stock}.`,
        },
        { status: 400 }
      );
    }

    await db.cartItem.update({
      where: { userId_variantId: { userId: user.id, variantId } },
      data: { qty },
    });
    return NextResponse.json(await getCart(user.id));
  } catch {
    return serverError(null);
  }
}

export async function DELETE(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    // Terima variantId dari query param (?variantId=) ATAU JSON body
    let variantId = new URL(req.url).searchParams.get("variantId") || "";
    if (!variantId) {
      try {
        const body = (await req.json()) as { variantId?: unknown };
        if (typeof body?.variantId === "string") variantId = body.variantId;
      } catch {
        /* abaikan */
      }
    }
    if (!variantId) {
      return NextResponse.json(
        { error: "Parameter variantId wajib diisi." },
        { status: 400 }
      );
    }
    await db.cartItem.deleteMany({
      where: { userId: user.id, variantId },
    });
    return NextResponse.json(await getCart(user.id));
  } catch {
    return serverError(null);
  }
}

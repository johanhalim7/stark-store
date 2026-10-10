export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";

const reviewSchema = z.object({
  orderId: z.string({ error: "orderId wajib diisi." }).min(1),
  productId: z.string({ error: "productId wajib diisi." }).min(1),
  rating: z
    .number({ error: "Rating wajib diisi." })
    .int("Rating harus bilangan bulat.")
    .min(1, "Rating minimal 1.")
    .max(5, "Rating maksimal 5."),
  title: z.string().max(120).optional(),
  body: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const parsed = await parseJsonBody(req, reviewSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { orderId, productId, rating, title, body } = parsed.data;

    // Order milik sendiri & sudah COMPLETED
    const order = await db.order.findFirst({
      where: { id: orderId, userId: user.id },
      select: { id: true, status: true, items: { select: { productId: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }
    if (order.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Ulasan hanya bisa diberikan untuk pesanan yang sudah selesai." },
        { status: 400 }
      );
    }
    if (!order.items.some((i) => i.productId === productId)) {
      return NextResponse.json(
        { error: "Produk ini tidak ada dalam pesanan tersebut." },
        { status: 400 }
      );
    }

    const existing = await db.review.findUnique({
      where: {
        orderId_productId_userId: {
          orderId,
          productId,
          userId: user.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Anda sudah memberikan ulasan untuk produk ini." },
        { status: 400 }
      );
    }

    const review = await db.review.create({
      data: { orderId, productId, userId: user.id, rating, title, body },
    });

    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch {
    return serverError(null);
  }
}

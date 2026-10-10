export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serverError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const categorySlug = (url.searchParams.get("category") || "").trim();
    const sort = url.searchParams.get("sort") || "terbaru";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const perPage = Math.min(
      50,
      Math.max(1, Number(url.searchParams.get("perPage")) || 12)
    );

    let categoryId: string | undefined;
    if (categorySlug) {
      const cat = await db.category.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      });
      if (!cat) {
        return NextResponse.json({ products: [], total: 0, page, perPage });
      }
      categoryId = cat.id;
    }

    const where = {
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
      variants: { some: { isActive: true } },
    };

    const orderBy =
      sort === "termurah"
        ? { price: "asc" as const }
        : sort === "termahal"
          ? { price: "desc" as const }
          : sort === "terlaris"
            ? { soldCount: "desc" as const }
            : { createdAt: "desc" as const };

    const [total, products] = await Promise.all([
      db.product.count({ where }),
      db.product.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          compareAtPrice: true,
          images: true,
          soldCount: true,
          category: { select: { name: true, slug: true } },
          variants: {
            where: { isActive: true },
            select: { id: true, name: true, price: true, stock: true },
            orderBy: { name: "asc" },
          },
        },
      }),
    ]);

    const ids = products.map((p) => p.id);
    const ratingAgg = ids.length
      ? await db.review.groupBy({
          by: ["productId"],
          where: { productId: { in: ids }, isHidden: false },
          _avg: { rating: true },
          _count: { _all: true },
        })
      : [];
    const ratingMap = new Map(
      ratingAgg.map((r) => [
        r.productId,
        { avg: r._avg.rating ?? 0, count: r._count._all },
      ])
    );

    return NextResponse.json({
      products: products.map((p) => ({
        ...p,
        rating: ratingMap.get(p.id)?.avg ?? 0,
        reviewCount: ratingMap.get(p.id)?.count ?? 0,
      })),
      total,
      page,
      perPage,
    });
  } catch {
    return serverError(null);
  }
}

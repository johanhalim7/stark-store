import { Suspense } from "react";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import FilterBar from "@/components/FilterBar";
import type { ProductCardData } from "@/lib/ui-types";

export const dynamic = "force-dynamic";

const PER_PAGE = 12;

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = first(sp.q).trim();
  const categorySlug = first(sp.category).trim();
  const sort = first(sp.sort).trim();
  const page = Math.max(1, parseInt(first(sp.page) || "1", 10) || 1);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: "desc" };
  if (sort === "termurah") orderBy = { price: "asc" };
  else if (sort === "termahal") orderBy = { price: "desc" };
  else if (sort === "terbaru") orderBy = { createdAt: "desc" };
  else if (sort === "terlaris") orderBy = { soldCount: "desc" };

  const [total, categories, products] = await Promise.all([
    db.product.count({ where }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { slug: true, name: true },
    }),
    db.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        slug: true,
        name: true,
        price: true,
        compareAtPrice: true,
        images: true,
        soldCount: true,
        variants: { where: { isActive: true }, select: { price: true } },
        reviews: { where: { isHidden: false }, select: { rating: true } },
      },
    }),
  ]);

  const cards: ProductCardData[] = products.map((p) => {
    const ratings = p.reviews.map((r) => r.rating);
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      compareAtPrice: p.compareAtPrice,
      images: p.images,
      soldCount: p.soldCount,
      rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      reviewCount: ratings.length,
      variants: p.variants,
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    if (sort) params.set("sort", sort);
    params.set("page", String(p));
    return `/products?${params.toString()}`;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">
        {q ? `Hasil pencarian "${q}"` : "Katalog Produk"}
        <span className="ml-2 text-sm font-normal text-gray-500">({total} produk)</span>
      </h1>

      <Suspense fallback={<div className="h-14 rounded-xl bg-white shadow-sm" />}>
        <FilterBar categories={categories} />
      </Suspense>

      {cards.length === 0 ? (
        <EmptyState
          title="Produk tidak ditemukan"
          subtitle="Coba kata kunci lain atau ubah filter kategori dan urutan."
          action={
            <Link
              href="/products"
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
            >
              Reset Filter
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {cards.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {page > 1 && (
                <Link
                  href={pageHref(page - 1)}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  ‹ Sebelumnya
                </Link>
              )}
              <span className="text-sm text-gray-500">
                Halaman {page} dari {totalPages}
              </span>
              {page < totalPages && (
                <Link
                  href={pageHref(page + 1)}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  Berikutnya ›
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

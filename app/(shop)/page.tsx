import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import BannerSlider from "@/components/BannerSlider";
import type { ProductCardData } from "@/lib/ui-types";

export const dynamic = "force-dynamic";

interface ProductWithRelations {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  soldCount: number;
  variants: { price: number | null }[];
  reviews: { rating: number }[];
}

function toCard(p: ProductWithRelations): ProductCardData {
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
}

const productSelect = {
  id: true,
  slug: true,
  name: true,
  price: true,
  compareAtPrice: true,
  images: true,
  soldCount: true,
  variants: { where: { isActive: true }, select: { price: true } },
  reviews: { where: { isHidden: false }, select: { rating: true } },
} as const;

export default async function HomePage() {
  const [banners, categories, bestSellers, newest] = await Promise.all([
    db.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, subtitle: true, image: true, link: true },
    }),
    db.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, slug: true, image: true },
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { soldCount: "desc" },
      take: 10,
      select: productSelect,
    }),
    db.product.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: productSelect,
    }),
  ]);

  return (
    <div className="space-y-8">
      <BannerSlider banners={banners} />

      {/* Strip kategori */}
      {categories.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Kategori</h2>
            <Link href="/products" className="text-sm text-primary hover:underline">
              Lihat Semua ›
            </Link>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.slug)}`}
                className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl bg-white p-3 shadow-sm hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-primary-light text-2xl">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    "🏷️"
                  )}
                </div>
                <span className="line-clamp-2 text-center text-xs font-medium text-gray-700">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Produk terlaris */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">🔥 Produk Terlaris</h2>
          <Link href="/products?sort=terlaris" className="text-sm text-primary hover:underline">
            Lihat Semua ›
          </Link>
        </div>
        {bestSellers.length === 0 ? (
          <EmptyState
            title="Belum ada produk"
            subtitle="Produk akan segera hadir. Pantau terus halaman ini!"
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {bestSellers.map((p) => (
              <ProductCard key={p.id} product={toCard(p)} />
            ))}
          </div>
        )}
      </section>

      {/* Produk terbaru */}
      {newest.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">✨ Produk Terbaru</h2>
            <Link href="/products?sort=terbaru" className="text-sm text-primary hover:underline">
              Lihat Semua ›
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {newest.map((p) => (
              <ProductCard key={p.id} product={toCard(p)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

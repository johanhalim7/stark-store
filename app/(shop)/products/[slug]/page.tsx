import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import ProductGallery from "@/components/ProductGallery";
import BuyBox from "@/components/BuyBox";
import Stars from "@/components/Stars";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true } },
      variants: {
        where: { isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, price: true, stock: true },
      },
      reviews: {
        where: { isHidden: false },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!product || !product.isActive) notFound();

  const ratings = product.reviews.map((r) => r.rating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const totalStock = product.variants.reduce((s, v) => s + v.stock, 0);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/" className="hover:text-primary">
          Beranda
        </Link>{" "}
        ›{" "}
        <Link href="/products" className="hover:text-primary">
          Katalog
        </Link>
        {product.category && (
          <>
            {" › "}
            <Link
              href={`/products?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-primary"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
            <Stars value={avgRating} />
            <span className="font-medium text-gray-700">{avgRating.toFixed(1)}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{ratings.length} ulasan</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">Terjual {product.soldCount}</span>
          </div>

          <div className="mt-4">
            <BuyBox
              slug={product.slug}
              basePrice={product.price}
              compareAtPrice={product.compareAtPrice}
              variants={product.variants}
            />
          </div>

          <div className="mt-4 rounded-xl bg-white p-5 text-sm shadow-sm">
            <h2 className="mb-2 font-semibold text-gray-900">Info Produk</h2>
            <dl className="space-y-1.5 text-gray-600">
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-400">Berat</dt>
                <dd>
                  {product.weight >= 1000
                    ? `${(product.weight / 1000).toLocaleString("id-ID")} kg`
                    : `${product.weight} gram`}
                </dd>
              </div>
              {product.sku && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-400">SKU</dt>
                  <dd>{product.sku}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-gray-400">Total Stok</dt>
                <dd>{totalStock}</dd>
              </div>
              {product.category && (
                <div className="flex gap-2">
                  <dt className="w-24 shrink-0 text-gray-400">Kategori</dt>
                  <dd>
                    <Link
                      href={`/products?category=${encodeURIComponent(product.category.slug)}`}
                      className="text-primary hover:underline"
                    >
                      {product.category.name}
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Deskripsi */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Deskripsi Produk</h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
          {product.description || "Belum ada deskripsi untuk produk ini."}
        </p>
      </section>

      {/* Ulasan */}
      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Ulasan Pembeli ({ratings.length})
        </h2>
        {product.reviews.length === 0 ? (
          <p className="text-sm text-gray-500">
            Belum ada ulasan untuk produk ini. Jadilah yang pertama membeli dan memberi
            ulasan!
          </p>
        ) : (
          <div className="space-y-4">
            {product.reviews.map((r) => (
              <article key={r.id} className="border-b border-gray-100 pb-4 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light font-bold text-primary">
                    {(r.user.name || "?").charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {r.user.name || "Pembeli"}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                  </div>
                  <Stars value={r.rating} size="text-xs" className="ml-auto" />
                </div>
                {r.title && (
                  <p className="mt-2 text-sm font-semibold text-gray-800">{r.title}</p>
                )}
                {r.body && (
                  <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{r.body}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}

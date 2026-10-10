import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { displayPrice, type ProductCardData } from "@/lib/ui-types";
import Stars from "./Stars";

export default function ProductCard({ product }: { product: ProductCardData }) {
  const price = displayPrice(product);
  const img = product.images?.[0];
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl text-gray-300">
            🖼️
          </div>
        )}
        {product.compareAtPrice && product.compareAtPrice > price && (
          <span className="absolute right-0 top-2 rounded-l bg-primary px-2 py-0.5 text-xs font-bold text-white">
            -
            {Math.round((1 - price / product.compareAtPrice) * 100)}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm text-gray-800">{product.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-base font-bold text-primary">{formatRupiah(price)}</span>
        </div>
        {product.compareAtPrice && product.compareAtPrice > price && (
          <span className="text-xs text-gray-400 line-through">
            {formatRupiah(product.compareAtPrice)}
          </span>
        )}
        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Stars value={product.rating} size="text-xs" />
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500">Terjual {product.soldCount}</span>
        </div>
      </div>
    </Link>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

export interface BannerItem {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  link: string | null;
}

export default function BannerSlider({ banners }: { banners: BannerItem[] }) {
  const [idx, setIdx] = useState(0);

  const next = useCallback(() => {
    setIdx((i) => (banners.length <= 1 ? i : (i + 1) % banners.length));
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(next, 5000);
    return () => clearInterval(t);
  }, [next, banners.length]);

  if (banners.length === 0) return null;

  const b = banners[idx];

  const slide = (
    <div className="relative block aspect-[16/6] w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-primary-dark sm:aspect-[16/5]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={b.image}
        alt={b.title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/10 to-transparent" />
      <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10">
        <h2 className="max-w-md text-2xl font-bold text-white drop-shadow sm:text-4xl">
          {b.title}
        </h2>
        {b.subtitle && (
          <p className="mt-1 max-w-md text-sm text-white/90 drop-shadow sm:text-base">
            {b.subtitle}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative">
      {b.link ? <Link href={b.link}>{slide}</Link> : slide}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => setIdx((idx - 1 + banners.length) % banners.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2.5 py-1 text-white hover:bg-black/50"
            aria-label="Sebelumnya"
          >
            ‹
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 px-2.5 py-1 text-white hover:bg-black/50"
            aria-label="Berikutnya"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Slide ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

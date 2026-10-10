"use client";

import { useState } from "react";

export default function ProductGallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const [idx, setIdx] = useState(0);
  const current = images[idx];

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-white text-6xl text-gray-300 shadow-sm">
        🖼️
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-white shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current} alt={name} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 && (
        <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${
                i === idx ? "border-primary" : "border-transparent"
              }`}
              aria-label={`Foto ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={`${name} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const SORTS = [
  { value: "", label: "Paling Relevan" },
  { value: "terlaris", label: "Terlaris" },
  { value: "terbaru", label: "Terbaru" },
  { value: "termurah", label: "Termurah" },
  { value: "termahal", label: "Termahal" },
];

export default function FilterBar({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const update = (patch: Record<string, string>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: q.trim() });
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      <form onSubmit={submitSearch} className="relative flex-1">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari produk…"
          className="w-full rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <button
          type="submit"
          aria-label="Cari"
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-gray-500 hover:text-primary"
        >
          🔍
        </button>
      </form>
      <select
        value={sp.get("category") ?? ""}
        onChange={(e) => update({ category: e.target.value })}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        aria-label="Kategori"
      >
        <option value="">Semua Kategori</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        value={sp.get("sort") ?? ""}
        onChange={(e) => update({ sort: e.target.value })}
        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary"
        aria-label="Urutkan"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

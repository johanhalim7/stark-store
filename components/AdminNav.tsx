"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/admin", label: "📊 Dashboard", exact: true },
  { href: "/admin/products", label: "📦 Produk" },
  { href: "/admin/categories", label: "🏷️ Kategori" },
  { href: "/admin/banners", label: "🖼️ Banner" },
  { href: "/admin/orders", label: "🧾 Pesanan" },
  { href: "/admin/reviews", label: "⭐ Ulasan" },
  { href: "/admin/reports", label: "📈 Laporan" },
];

/** Kerangka admin: topbar + sidebar + konten. Dipakai oleh app/admin/layout.tsx */
export default function AdminNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const navLinks = (
    <nav className="space-y-1">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          onClick={() => setOpen(false)}
          className={`block rounded-lg px-3 py-2 text-sm font-medium ${
            isActive(l.href, l.exact)
              ? "bg-primary text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* Topbar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <button
          className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Menu admin"
        >
          ☰
        </button>
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-lg font-black text-white">
            S
          </span>
          <span className="font-bold text-gray-900">
            Stark Store <span className="text-xs font-medium text-gray-400">Admin</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="hidden text-sm text-gray-600 hover:text-primary sm:block"
          >
            🔗 Lihat Toko
          </Link>
          <span className="hidden max-w-40 truncate text-sm text-gray-600 sm:block">
            {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Keluar
          </button>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar desktop */}
        <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-white p-4 lg:block">
          {navLinks}
        </aside>
        {/* Konten */}
        <main className="w-full min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>

      {/* Drawer mobile */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold text-gray-900">Menu Admin</span>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 hover:bg-gray-100"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
            {navLinks}
          </aside>
        </div>
      )}
    </div>
  );
}

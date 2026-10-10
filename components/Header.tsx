"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadCartCount = useCallback(async () => {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) return;
      const data = await res.json();
      const count = Array.isArray(data.items)
        ? data.items.reduce((s: number, it: { qty: number }) => s + (it.qty || 0), 0)
        : 0;
      setCartCount(count);
    } catch {
      /* abaikan */
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadCartCount();
    else setCartCount(0);
  }, [status, pathname, loadCartCount]);

  useEffect(() => {
    const handler = () => loadCartCount();
    window.addEventListener("cart-updated", handler);
    return () => window.removeEventListener("cart-updated", handler);
  }, [loadCartCount]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/products?q=${encodeURIComponent(q.trim())}`);
    setMobileMenuOpen(false);
  };

  const isAdmin = session?.user?.role === "ADMIN";
  const userName = session?.user?.name || session?.user?.email || "Akun";

  const searchBox = (
    <form onSubmit={submitSearch} className="relative w-full">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari produk…"
        className="w-full rounded-lg bg-white py-2 pl-4 pr-11 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-white/60"
      />
      <button
        type="submit"
        aria-label="Cari"
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-white hover:bg-primary-dark"
      >
        🔍
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-50 bg-primary shadow-md">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-16 items-center gap-3 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-xl font-black text-primary">
              S
            </span>
            <span className="hidden text-xl font-bold tracking-tight sm:block">
              Stark Store
            </span>
          </Link>

          <div className="hidden flex-1 md:block">{searchBox}</div>

          <nav className="ml-auto hidden items-center gap-5 text-sm font-medium text-white md:flex">
            <Link href="/" className="hover:underline">
              Beranda
            </Link>
            <Link href="/products" className="hover:underline">
              Katalog
            </Link>
          </nav>

          <Link
            href="/cart"
            aria-label="Keranjang"
            className="relative rounded-lg p-2 text-white hover:bg-white/10"
          >
            <span className="text-2xl">🛒</span>
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-bold text-primary">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>

          {status === "loading" ? (
            <div className="h-8 w-20 animate-pulse rounded-lg bg-white/20" />
          ) : session ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex max-w-36 items-center gap-2 rounded-lg px-2 py-1.5 text-white hover:bg-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-primary">
                  {userName.charAt(0).toUpperCase()}
                </span>
                <span className="hidden truncate text-sm font-medium lg:block">
                  {userName}
                </span>
                <span className="text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-xl">
                  <div className="border-b border-gray-100 px-4 py-2 text-sm font-medium text-gray-900">
                    <p className="truncate">{userName}</p>
                    {isAdmin && (
                      <p className="text-xs font-semibold text-primary">ADMIN</p>
                    )}
                  </div>
                  <Link
                    href="/orders"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Pesanan Saya
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    Akun
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm font-medium text-primary hover:bg-gray-50"
                    >
                      Panel Admin
                    </Link>
                  )}
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                  >
                    Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-white hover:bg-white/10"
              >
                Masuk
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-gray-100"
              >
                Daftar
              </Link>
            </div>
          )}

          <button
            className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="Menu"
          >
            ☰
          </button>
        </div>

        <div className="pb-3 md:hidden">{searchBox}</div>
      </div>

      {mobileMenuOpen && (
        <nav className="border-t border-white/20 bg-primary px-4 py-3 text-white md:hidden">
          <div className="flex flex-col gap-1 text-sm font-medium">
            <Link href="/" onClick={() => setMobileMenuOpen(false)} className="rounded px-2 py-2 hover:bg-white/10">
              Beranda
            </Link>
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="rounded px-2 py-2 hover:bg-white/10">
              Katalog
            </Link>
            {session ? (
              <>
                <Link href="/orders" onClick={() => setMobileMenuOpen(false)} className="rounded px-2 py-2 hover:bg-white/10">
                  Pesanan Saya
                </Link>
                <Link href="/account" onClick={() => setMobileMenuOpen(false)} className="rounded px-2 py-2 hover:bg-white/10">
                  Akun ({userName})
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="rounded px-2 py-2 font-semibold hover:bg-white/10">
                    Panel Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded px-2 py-2 text-left hover:bg-white/10"
                >
                  Keluar
                </button>
              </>
            ) : (
              <div className="flex gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex-1 rounded-lg bg-white/15 px-3 py-2 text-center">
                  Masuk
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)} className="flex-1 rounded-lg bg-white px-3 py-2 text-center font-semibold text-primary">
                  Daftar
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}

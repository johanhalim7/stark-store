import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl">🔍</p>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">404 — Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-gray-500">
          Maaf, halaman yang Anda cari tidak ada atau sudah dipindahkan.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Kembali ke Beranda
          </Link>
          <Link
            href="/products"
            className="rounded-lg border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light"
          >
            Lihat Katalog
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

const helpLinks = [
  "Cara Berbelanja",
  "Lacak Pesanan",
  "Pengiriman",
  "Pembayaran",
  "Pengembalian Dana",
  "Hubungi Kami",
];

const categories = [
  "Elektronik",
  "Fashion",
  "Kesehatan",
  "Rumah Tangga",
  "Olahraga",
  "Hobi",
];

export default function Footer() {
  return (
    <footer className="mt-10 bg-white text-gray-600">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-xl font-black text-white">
              S
            </span>
            <span className="text-xl font-bold text-gray-900">Stark Store</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">
            Belanja online mudah, aman, dan cepat. Produk pilihan dengan harga
            terbaik, dikirim ke seluruh Indonesia.
          </p>
          <p className="mt-3 text-sm">
            📧 cs@starkstore.id
            <br />
            📞 0800-1234-567
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Kategori Populer
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c}>
                <Link href={`/products?q=${encodeURIComponent(c)}`} className="hover:text-primary">
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Bantuan
          </h4>
          <ul className="mt-3 space-y-2 text-sm">
            {helpLinks.map((l) => (
              <li key={l}>
                <Link href="#" className="hover:text-primary">
                  {l}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
            Pembayaran & Pengiriman
          </h4>
          <p className="mt-3 text-sm">
            Pembayaran aman via Midtrans: QRIS, transfer bank, e-wallet, kartu
            kredit, dan gerai retail.
          </p>
          <p className="mt-2 text-sm">
            Didukung JNE, J&T, SiCepat, Ninja, TIKI, dan POS Indonesia.
          </p>
        </div>
      </div>
      <div className="border-t border-gray-100">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-400 sm:flex-row">
          <p>© 2026 Stark Store. Seluruh hak cipta dilindungi.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-primary">
              Syarat & Ketentuan
            </Link>
            <Link href="#" className="hover:text-primary">
              Kebijakan Privasi
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:py-6">{children}</main>
      <Footer />
    </div>
  );
}

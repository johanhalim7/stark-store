"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import AddressForm from "@/components/AddressForm";
import { apiError, type AddressData } from "@/lib/ui-types";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AddressData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/addresses");
      if (res.status === 401) {
        router.push("/login?callbackUrl=/account");
        return;
      }
      if (!res.ok) {
        setError(await apiError(res, "Gagal memuat alamat"));
        return;
      }
      const data = await res.json();
      setAddresses(Array.isArray(data) ? data : data.addresses ?? []);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/account");
      return;
    }
    if (status === "authenticated") load();
  }, [status, load, router]);

  const remove = async (id: string) => {
    if (!confirm("Hapus alamat ini?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      if (!res.ok) {
        alert(await apiError(res, "Gagal menghapus alamat"));
        return;
      }
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      alert("Tidak dapat terhubung ke server.");
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  if (status === "loading" || loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-xl bg-white" />
        <div className="h-32 animate-pulse rounded-xl bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Akun Saya</h1>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-bold text-gray-900">👤 Profil</h2>
        <dl className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <dt className="w-20 text-gray-400">Nama</dt>
            <dd className="font-medium text-gray-900">{session?.user?.name || "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-20 text-gray-400">Email</dt>
            <dd className="font-medium text-gray-900">{session?.user?.email || "—"}</dd>
          </div>
          {session?.user?.role === "ADMIN" && (
            <div className="flex gap-2">
              <dt className="w-20 text-gray-400">Peran</dt>
              <dd className="font-semibold text-primary">ADMIN</dd>
            </div>
          )}
        </dl>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-4 rounded-lg border border-red-200 px-5 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
        >
          Keluar
        </button>
      </section>

      <section className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">📍 Daftar Alamat</h2>
          {!showForm && (
            <button
              onClick={() => {
                setEditing(null);
                setShowForm(true);
              }}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Tambah Alamat
            </button>
          )}
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {showForm && (
          <div className="mb-4">
            <AddressForm
              initial={editing}
              onSaved={(addr) => {
                setAddresses((prev) => {
                  const rest = prev.filter((a) => a.id !== addr.id);
                  return [addr, ...rest];
                });
                closeForm();
              }}
              onCancel={closeForm}
            />
          </div>
        )}

        {addresses.length === 0 && !showForm ? (
          <p className="text-sm text-gray-500">Belum ada alamat tersimpan.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((a) => (
              <div key={a.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {a.label} — {a.recipientName}{" "}
                      <span className="font-normal text-gray-500">({a.phone})</span>
                      {a.isDefault && (
                        <span className="ml-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">
                          UTAMA
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-gray-600">
                      {a.detail}, {a.subdistrict ? `${a.subdistrict}, ` : ""}
                      {a.city}, {a.province} {a.postalCode}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditing(a);
                        setShowForm(true);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Ubah
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      className="text-xs font-medium text-red-600 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

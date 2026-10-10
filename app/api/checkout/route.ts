export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";
import { generateOrderNumber } from "@/lib/format";
import { getShippingCost } from "@/lib/rajaongkir";
import {
  midtransConfigured,
  createSnapTransaction,
  type SnapItem,
} from "@/lib/midtrans";

const checkoutSchema = z.object({
  addressId: z.string({ error: "Alamat wajib dipilih." }).min(1, "Alamat wajib dipilih."),
  courier: z.string({ error: "Kurir wajib dipilih." }).trim().min(1, "Kurir wajib dipilih."),
  courierService: z
    .string({ error: "Layanan kurir wajib dipilih." })
    .trim()
    .min(1, "Layanan kurir wajib dipilih."),
  shippingCost: z
    .number({ error: "Ongkir tidak valid." })
    .int("Ongkir tidak valid.")
    .min(0, "Ongkir tidak valid."),
});

const ORDER_TTL_MS = 24 * 60 * 60 * 1000; // 24 jam

export async function POST(req: Request) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;

    const parsed = await parseJsonBody(req, checkoutSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { addressId, courier, courierService, shippingCost } = parsed.data;

    // 1) Keranjang
    const cartItems = await db.cartItem.findMany({
      where: { userId: user.id },
      include: {
        product: true,
        variant: true,
      },
    });
    if (cartItems.length === 0) {
      return NextResponse.json(
        { error: "Keranjang belanja masih kosong." },
        { status: 400 }
      );
    }

    // 2) Alamat milik sendiri
    const address = await db.address.findFirst({
      where: { id: addressId, userId: user.id },
    });
    if (!address) {
      return NextResponse.json({ error: "Alamat tidak ditemukan." }, { status: 404 });
    }

    // 3) Validasi produk/varian + hitung subtotal dari DB
    const lines: {
      productId: string;
      variantId: string;
      name: string;
      variantName: string;
      image: string | null;
      price: number;
      qty: number;
      weight: number;
    }[] = [];
    let subtotal = 0;
    let totalWeight = 0;
    for (const item of cartItems) {
      const { product, variant } = item;
      if (!product.isActive || !variant.isActive) {
        return NextResponse.json(
          { error: `"${product.name}" sudah tidak tersedia.` },
          { status: 400 }
        );
      }
      if (variant.stock < item.qty) {
        return NextResponse.json(
          {
            error: `Stok "${product.name} (${variant.name})" tidak cukup. Tersisa ${variant.stock}.`,
          },
          { status: 400 }
        );
      }
      const price = variant.price ?? product.price;
      subtotal += price * item.qty;
      totalWeight += product.weight * item.qty;
      lines.push({
        productId: product.id,
        variantId: variant.id,
        name: product.name,
        variantName: variant.name,
        image: product.images[0] ?? null,
        price,
        qty: item.qty,
        weight: product.weight,
      });
    }

    // 4) Verifikasi ongkir ke RajaOngkir (server hitung ulang)
    let verifiedCost: number;
    try {
      const services = await getShippingCost({
        destinationCityId: address.cityId,
        destinationSubdistrictId: address.subdistrictId ?? undefined,
        weightGram: totalWeight,
        courier,
      });
      const match = services.find(
        (s) => s.service.toLowerCase() === courierService.toLowerCase()
      );
      if (!match) {
        return NextResponse.json(
          { error: "Ongkir berubah, silakan pilih ulang." },
          { status: 400 }
        );
      }
      verifiedCost = match.cost;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghitung ongkir.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (verifiedCost !== shippingCost) {
      return NextResponse.json(
        { error: "Ongkir berubah, silakan pilih ulang." },
        { status: 400 }
      );
    }

    // 5) Midtrans harus terkonfigurasi
    if (!midtransConfigured()) {
      return NextResponse.json(
        {
          error:
            "Pembayaran online belum dikonfigurasi. Hubungi admin toko untuk melanjutkan.",
        },
        { status: 503 }
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { email: true },
    });

    const total = subtotal + verifiedCost;
    const expiresAt = new Date(Date.now() + ORDER_TTL_MS);
    const addressSnapshot = {
      label: address.label,
      recipientName: address.recipientName,
      phone: address.phone,
      province: address.province,
      city: address.city,
      subdistrict: address.subdistrict,
      postalCode: address.postalCode,
      detail: address.detail,
    };

    // 6) Buat order + reservasi stok dalam satu transaksi
    let createdOrderId: string | null = null;
    let orderNumber: string | null = null;
    for (let attempt = 0; attempt < 3 && !createdOrderId; attempt++) {
      const candidate = generateOrderNumber();
      try {
        const order = await db.$transaction(async (tx) => {
          // validasi ulang stok di dalam transaksi (anti race)
          for (const line of lines) {
            const v = await tx.productVariant.findUnique({
              where: { id: line.variantId },
              include: { product: { select: { isActive: true } } },
            });
            if (!v || !v.isActive || !v.product.isActive) {
              throw new Error(`"${line.name}" sudah tidak tersedia.`);
            }
            if (v.stock < line.qty) {
              throw new Error(
                `Stok "${line.name} (${line.variantName})" tidak cukup. Tersisa ${v.stock}.`
              );
            }
          }
          const created = await tx.order.create({
            data: {
              orderNumber: candidate,
              userId: user.id,
              status: "PENDING_PAYMENT",
              subtotal,
              shippingCost: verifiedCost,
              total,
              courier,
              courierService,
              addressSnapshot,
              expiresAt,
              items: {
                create: lines.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId,
                  name: l.name,
                  variantName: l.variantName,
                  image: l.image,
                  price: l.price,
                  qty: l.qty,
                  weight: l.weight,
                })),
              },
              payment: {
                create: {
                  midtransOrderId: candidate,
                  transactionStatus: "pending",
                  grossAmount: total,
                },
              },
              shipment: {
                create: {
                  courier,
                  service: courierService,
                  cost: verifiedCost,
                },
              },
            },
          });
          // reservasi stok
          for (const line of lines) {
            await tx.productVariant.update({
              where: { id: line.variantId },
              data: { stock: { decrement: line.qty } },
            });
          }
          // kosongkan keranjang
          await tx.cartItem.deleteMany({ where: { userId: user.id } });
          return created;
        });
        createdOrderId = order.id;
        orderNumber = order.orderNumber;
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2002"
        ) {
          continue; // nomor order tabrakan, coba lagi
        }
        if (err instanceof Error && err.message.startsWith("Stok")) {
          return NextResponse.json({ error: err.message }, { status: 400 });
        }
        throw err;
      }
    }
    if (!createdOrderId || !orderNumber) {
      return NextResponse.json(
        { error: "Gagal membuat pesanan. Silakan coba lagi." },
        { status: 500 }
      );
    }

    // 7) Minta Snap token ke Midtrans
    const snapItems: SnapItem[] = [
      ...lines.map((l) => ({
        id: l.variantId,
        price: l.price,
        quantity: l.qty,
        name: `${l.name} (${l.variantName})`,
      })),
      {
        id: "ONGKIR",
        price: verifiedCost,
        quantity: 1,
        name: `Ongkir ${courier.toUpperCase()} ${courierService}`,
      },
    ];
    let token: string;
    try {
      const snap = await createSnapTransaction({
        orderId: orderNumber,
        grossAmount: total,
        items: snapItems,
        customer: {
          first_name: address.recipientName,
          email: dbUser?.email ?? undefined,
          phone: address.phone,
        },
      });
      token = snap.token;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghubungi Midtrans.";
      // Order tetap ada -> bisa bayar ulang via /api/orders/[id]/pay
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    await db.order.update({
      where: { id: createdOrderId },
      data: { snapToken: token },
    });

    return NextResponse.json(
      { orderId: createdOrderId, orderNumber, snapToken: token },
      { status: 201 }
    );
  } catch {
    return serverError(null);
  }
}

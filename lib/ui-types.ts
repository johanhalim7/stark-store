/**
 * Tipe data bersama untuk komponen UI (client & server).
 * Bentuknya mengikuti kontrak API yang dibangun paralel — dibaca defensif.
 */

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  soldCount: number;
  rating: number;
  reviewCount: number;
  variants: { price: number | null }[];
}

/** Harga tampil: varian termurah (mempertimbangkan override), atau harga dasar. */
export function displayPrice(p: {
  price: number;
  variants: { price: number | null }[];
}): number {
  if (!p.variants || p.variants.length === 0) return p.price;
  return Math.min(...p.variants.map((v) => v.price ?? p.price));
}

export interface CartItemData {
  variantId: string;
  qty: number;
  product: {
    id: string;
    name: string;
    slug: string;
    images: string[];
    price: number;
    weight?: number;
  };
  variant: { id: string; name: string; price: number | null; stock: number };
}

export interface CartData {
  items: CartItemData[];
  subtotal: number;
}

export interface AddressData {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  provinceId: string;
  province: string;
  cityId: string;
  city: string;
  subdistrictId: string | null;
  subdistrict: string | null;
  postalCode: string;
  detail: string;
  isDefault: boolean;
}

export interface RegionItem {
  id: string;
  name: string;
}

export interface ShippingService {
  service: string;
  description: string;
  cost: number;
  etd: string;
}

export interface CheckoutConfig {
  snapJsUrl: string;
  clientKey: string;
  isProduction: boolean;
  midtransReady: boolean;
  rajaongkirReady: boolean;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  createdAt: string;
}

export interface OrderItemData {
  id: string;
  productId: string;
  name: string;
  variantName: string | null;
  image: string | null;
  price: number;
  qty: number;
  weight: number;
}

export interface OrderDetailData extends OrderListItem {
  courier: string;
  courierService: string;
  addressSnapshot: Record<string, string | undefined | null>;
  snapToken: string | null;
  expiresAt: string;
  paidAt: string | null;
  items: OrderItemData[];
  payment: { transactionStatus: string; paymentType: string | null } | null;
  shipment: {
    courier: string;
    service: string;
    trackingNumber: string | null;
  } | null;
  reviewedProductIds?: string[];
}

/** Ambil pesan error dari respons API {error} secara aman. */
export async function apiError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data.error === "string" && data.error) return data.error;
  } catch {
    /* abaikan */
  }
  return `${fallback} (HTTP ${res.status})`;
}

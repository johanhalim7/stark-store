import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "./auth";

export interface ApiUser {
  id: string;
  role: string;
  email?: string | null;
  name?: string | null;
}

/** Ambil user dari sesi (null bila belum login). */
export async function getSessionUser(): Promise<ApiUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u || !(u as { id?: string }).id) return null;
  return {
    id: (u as { id: string }).id,
    role: (u as { role?: string }).role ?? "CUSTOMER",
    email: u.email,
    name: u.name,
  };
}

export function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Anda harus login terlebih dahulu." },
    { status: 401 }
  );
}

export function forbidden(): NextResponse {
  return NextResponse.json(
    { error: "Akses ditolak. Halaman ini khusus admin." },
    { status: 403 }
  );
}

/** Guard login untuk API route: return { user } atau { res } (error response). */
export async function requireUser(): Promise<
  { user: ApiUser } | { res: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) return { res: unauthorized() };
  return { user };
}

/** Guard admin untuk API route. */
export async function requireAdmin(): Promise<
  { user: ApiUser } | { res: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) return { res: unauthorized() };
  if (user.role !== "ADMIN") return { res: forbidden() };
  return { user };
}

export function firstZodError(err: z.ZodError): string {
  const issue = err.issues[0] as { message?: string } | undefined;
  return issue?.message || "Data tidak valid.";
}

/** Parse JSON body + validasi zod. Gagal -> { ok:false, error, status }. */
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }
> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, error: "Body request tidak valid (bukan JSON).", status: 400 };
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error), status: 400 };
  }
  return { ok: true, data: parsed.data };
}

/** Bungkus error tak terduga jadi JSON 500 (tanpa membocorkan detail). */
export function serverError(err: unknown): NextResponse {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error("[api]", err);
  }
  return NextResponse.json(
    { error: "Terjadi kesalahan pada server. Silakan coba lagi." },
    { status: 500 }
  );
}

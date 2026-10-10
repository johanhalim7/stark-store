import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient malas (lazy): `new PrismaClient()` baru dipanggil saat
 * query pertama. Penting karena modul ini ikut terbundel ke proxy.ts
 * (edge runtime) — Prisma tidak boleh di-instansiasi di edge.
 * Dengan session JWT, proxy tidak pernah menyentuh DB.
 */
const globalForPrisma = globalThis as unknown as { __prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.__prisma) {
    globalForPrisma.__prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalForPrisma.__prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_t, prop, receiver) {
    const client = getClient() as unknown as Record<string | symbol, unknown>;
    const v = client[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(client) : v;
  },
});

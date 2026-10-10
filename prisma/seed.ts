/**
 * Seed database: buat akun admin + 1 kategori contoh.
 * Jalankan: npx prisma db seed
 * Butuh env: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!email || !password) {
    throw new Error("ADMIN_EMAIL dan ADMIN_PASSWORD wajib diisi untuk seed.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", passwordHash, name: "Admin Stark Store" },
    create: {
      email,
      name: "Admin Stark Store",
      passwordHash,
      role: "ADMIN",
      emailVerified: new Date(),
    },
  });
  console.log("Admin siap:", admin.email);

  // KATEGORI CONTOH — jelas ditandai; hapus dari dashboard admin bila tidak dipakai.
  await db.category.upsert({
    where: { slug: "kategori-contoh" },
    update: {},
    create: {
      name: "Kategori Contoh",
      slug: "kategori-contoh",
      description:
        "KATEGORI CONTOH dari seed — hapus lewat dashboard admin bila tidak dipakai.",
      sortOrder: 999,
    },
  });
  console.log("Kategori contoh siap.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

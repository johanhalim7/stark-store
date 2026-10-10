export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { parseJsonBody, serverError } from "@/lib/api";

const registerSchema = z.object({
  name: z.string({ error: "Nama wajib diisi." }).trim().min(1, "Nama wajib diisi.").max(100),
  email: z
    .string({ error: "Email wajib diisi." })
    .trim()
    .email("Format email tidak valid.")
    .max(255),
  password: z
    .string({ error: "Kata sandi wajib diisi." })
    .min(6, "Kata sandi minimal 6 karakter.")
    .max(100),
});

export async function POST(req: Request) {
  try {
    const parsed = await parseJsonBody(req, registerSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const { name, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan login." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await db.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role: "CUSTOMER",
      },
    });

    return NextResponse.json(
      { ok: true, message: "Pendaftaran berhasil. Silakan login." },
      { status: 201 }
    );
  } catch {
    return serverError(null);
  }
}

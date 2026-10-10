export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseJsonBody, requireUser, serverError } from "@/lib/api";
import { addressSchema } from "../route";

const patchSchema = addressSchema.partial();

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;
    const { id } = await params;

    const parsed = await parseJsonBody(req, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    const data = parsed.data;

    const address = await db.$transaction(async (tx) => {
      const existing = await tx.address.findFirst({
        where: { id, userId: user.id },
      });
      if (!existing) return null;
      if (data.isDefault) {
        await tx.address.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }
      return tx.address.update({ where: { id }, data });
    });

    if (!address) {
      return NextResponse.json({ error: "Alamat tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, address });
  } catch {
    return serverError(null);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireUser();
    if ("res" in guard) return guard.res;
    const { user } = guard;
    const { id } = await params;

    const result = await db.address.deleteMany({
      where: { id, userId: user.id },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Alamat tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return serverError(null);
  }
}

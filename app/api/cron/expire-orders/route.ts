export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { expireOverdueOrders } from "@/lib/orders";
import { serverError } from "@/lib/api";

export async function GET(req: Request) {
  try {
    const secret = process.env.CRON_SECRET || "";
    if (!secret) {
      return NextResponse.json(
        {
          error:
            "CRON_SECRET belum dikonfigurasi. Isi di .env lalu restart server.",
        },
        { status: 503 }
      );
    }
    const header = req.headers.get("authorization") || "";
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json(
        { error: "Tidak diizinkan." },
        { status: 401 }
      );
    }

    const expired = await expireOverdueOrders();
    return NextResponse.json({ ok: true, expired });
  } catch {
    return serverError(null);
  }
}

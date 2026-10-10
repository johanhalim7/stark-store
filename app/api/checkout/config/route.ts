export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  midtransConfigured,
  snapJsUrl,
  midtransClientKey,
} from "@/lib/midtrans";
import { rajaongkirConfigured } from "@/lib/rajaongkir";

export async function GET() {
  return NextResponse.json({
    snapJsUrl: snapJsUrl(),
    clientKey: midtransClientKey(), // client key boleh publik; server key TIDAK PERNAH dikirim
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    midtransReady: midtransConfigured(),
    rajaongkirReady: rajaongkirConfigured(),
  });
}

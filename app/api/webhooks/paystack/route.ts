import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Generic Paystack webhook. Verifies HMAC SHA512 and acknowledges events.
 * Wire tenant subscription checkout here when you add billed plans.
 */
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    const secret = env.PAYSTACK_SECRET_KEY || "";

    if (!secret || !signature) {
      return NextResponse.json({ message: "Missing secret or signature" }, { status: 400 });
    }

    const hash = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as { event?: string };
    logger.info({ event: payload.event }, "paystack webhook received");
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
}

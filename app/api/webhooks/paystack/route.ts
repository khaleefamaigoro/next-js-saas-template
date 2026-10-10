import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
<<<<<<< HEAD
import { claimDurableKey } from "@/lib/platform/durable-key";
import { applyPaidPlan } from "@/lib/platform/paystack";

type PaystackEvent = {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    amount?: number;
    currency?: string;
    metadata?: { tenantId?: string; planKey?: string };
  };
};

=======

/**
 * Generic Paystack webhook. Verifies HMAC SHA512 and acknowledges events.
 * Wire tenant subscription checkout here when you add billed plans.
 */
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
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

<<<<<<< HEAD
    const payload = JSON.parse(rawBody) as PaystackEvent;
    const eventId = payload.data?.id != null ? String(payload.data.id) : payload.data?.reference;
    if (eventId) {
      const claimed = await claimDurableKey(`paystack:${payload.event ?? "event"}:${eventId}`);
      if (!claimed) {
        return NextResponse.json({ received: true, duplicate: true });
      }
    }

    if (payload.event === "charge.success") {
      const tenantId = payload.data?.metadata?.tenantId;
      const planKey = payload.data?.metadata?.planKey;
      const reference = payload.data?.reference;
      if (tenantId && planKey && reference) {
        await applyPaidPlan({
          tenantId,
          planKey,
          reference,
          amountKobo: payload.data?.amount ?? 0,
          currency: payload.data?.currency,
        });
      }
    }

    logger.info({ event: payload.event, reference: payload.data?.reference }, "paystack webhook received");
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error({ err }, "paystack_webhook_failed");
=======
    const payload = JSON.parse(rawBody) as { event?: string };
    logger.info({ event: payload.event }, "paystack webhook received");
    return NextResponse.json({ received: true });
  } catch {
>>>>>>> 89fe34529615c06917108e3f8d837c9807b2415a
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
}

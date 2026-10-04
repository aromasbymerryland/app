import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getRazorpayConfiguration } from "@/lib/payments/razorpay-config";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function matchesSignature(body: string, received: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const supplied = Buffer.from(received, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function POST(request: Request) {
  const razorpay = getRazorpayConfiguration();
  if (!razorpay || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Razorpay webhook server credentials are not configured.");
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }
  const webhookSecret = razorpay.webhookSecret;

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!matchesSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }
  if (!isRecord(event) || event.event !== "payment.captured") {
    return NextResponse.json({ received: true });
  }

  const payload = event.payload;
  const payment = isRecord(payload) && isRecord(payload.payment) && isRecord(payload.payment.entity)
    ? payload.payment.entity
    : null;
  if (
    !payment ||
    typeof payment.order_id !== "string" ||
    !/^order_[A-Za-z0-9]+$/.test(payment.order_id) ||
    typeof payment.id !== "string" ||
    !/^pay_[A-Za-z0-9]+$/.test(payment.id) ||
    !Number.isSafeInteger(payment.amount) ||
    payment.currency !== "INR" ||
    payment.status !== "captured"
  ) {
    return NextResponse.json({ error: "Invalid captured-payment event." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("total,payment_method,status")
    .eq("razorpay_order_id", payment.order_id)
    .maybeSingle();
  if (orderError) {
    console.error("Unable to find order for Razorpay webhook", orderError);
    return NextResponse.json({ error: "Could not process payment event." }, { status: 500 });
  }
  if (!order || order.payment_method !== "Razorpay") {
    console.error("Razorpay payment event did not match a store order.");
    return NextResponse.json({ error: "Payment event does not match an active order." }, { status: 400 });
  }
  if (Math.round(Number(order.total) * 100) !== payment.amount) {
    console.error("Razorpay webhook amount did not match the order total.");
    return NextResponse.json({ error: "Payment amount mismatch." }, { status: 400 });
  }

  if (order.status === "Cancelled") {
    const { data: flagged, error: flagError } = await admin.rpc("flag_razorpay_refund_required", {
      p_provider_order_id: payment.order_id,
      p_payment_id: payment.id,
    });
    if (flagError || !flagged) {
      console.error("Could not flag captured payment on cancelled order for refund", flagError);
      return NextResponse.json({ error: "Could not record refund follow-up." }, { status: 500 });
    }
    return NextResponse.json({ received: true, refundRequired: true });
  }

  const { data: markedPaid, error: markError } = await admin.rpc("mark_razorpay_payment_paid", {
    p_provider_order_id: payment.order_id,
    p_payment_id: payment.id,
  });
  if (markError || !markedPaid) {
    console.error("Could not apply captured Razorpay payment", markError);
    return NextResponse.json({ error: "Could not apply payment event." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

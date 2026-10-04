import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRazorpayConfiguration } from "@/lib/payments/razorpay-config";

export const runtime = "nodejs";

type VerifyRequest = {
  appOrderId?: unknown;
  razorpay_order_id?: unknown;
  razorpay_payment_id?: unknown;
  razorpay_signature?: unknown;
};

function safeSignatureMatch(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Please sign in to confirm your payment." }, { status: 401 });
  }

  let body: VerifyRequest;
  try {
    body = await request.json() as VerifyRequest;
  } catch {
    return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
  }
  const { appOrderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;
  if (
    typeof appOrderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appOrderId) ||
    typeof razorpay_order_id !== "string" ||
    !/^order_[A-Za-z0-9]+$/.test(razorpay_order_id) ||
    typeof razorpay_payment_id !== "string" ||
    !/^pay_[A-Za-z0-9]+$/.test(razorpay_payment_id) ||
    typeof razorpay_signature !== "string"
  ) {
    return NextResponse.json({ error: "Invalid payment confirmation." }, { status: 400 });
  }

  const razorpay = getRazorpayConfiguration();
  if (!razorpay) {
    console.error("Razorpay verification is unavailable because its server credentials are not configured.");
    return NextResponse.json({ error: "Payment verification is temporarily unavailable." }, { status: 503 });
  }
  const expectedSignature = createHmac("sha256", razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");
  if (!safeSignatureMatch(expectedSignature, razorpay_signature)) {
    return NextResponse.json({ error: "The payment confirmation could not be verified." }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,total,status,payment_method,payment_status,razorpay_order_id,razorpay_payment_id")
    .eq("id", appOrderId)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (orderError) {
    console.error("Unable to load order for payment confirmation", orderError);
    return NextResponse.json({ error: "We couldn’t verify this order right now." }, { status: 500 });
  }
  if (
    !order ||
    order.payment_method !== "Razorpay" ||
    order.razorpay_order_id !== razorpay_order_id
  ) {
    return NextResponse.json({ error: "This payment does not match an active order." }, { status: 400 });
  }

  let providerPayment: Response;
  try {
    providerPayment = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(razorpay_payment_id)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
  } catch (providerError) {
    console.error("Razorpay payment verification request failed", providerError);
    return NextResponse.json({ error: "We couldn’t confirm payment with Razorpay. Please refresh in a moment." }, { status: 502 });
  }

  const paymentData: unknown = await providerPayment.json().catch((parseError: unknown) => {
    console.error("Could not read Razorpay payment response", parseError);
    return null;
  });
  if (
    !providerPayment.ok ||
    !paymentData ||
    typeof paymentData !== "object" ||
    !("order_id" in paymentData) ||
    paymentData.order_id !== razorpay_order_id ||
    !("amount" in paymentData) ||
    paymentData.amount !== Math.round(Number(order.total) * 100) ||
    !("currency" in paymentData) ||
    paymentData.currency !== "INR" ||
    !("status" in paymentData) ||
    paymentData.status !== "captured"
  ) {
    return NextResponse.json({ error: "Razorpay has not confirmed a captured payment for this order yet." }, { status: 409 });
  }

  const admin = createSupabaseAdminClient();
  if (order.status === "Cancelled") {
    const { data: flagged, error: flagError } = await admin.rpc("flag_razorpay_refund_required", {
      p_provider_order_id: razorpay_order_id,
      p_payment_id: razorpay_payment_id,
    });
    if (flagError || !flagged) {
      console.error("Could not flag captured payment on cancelled order for refund", flagError);
      return NextResponse.json({ error: "Payment was received for a cancelled order. Please contact support immediately." }, { status: 500 });
    }
    return NextResponse.json({ error: "This order was cancelled, but Razorpay captured the payment. Please contact support for a refund." }, { status: 409 });
  }

  const { data: markedPaid, error: markError } = await admin.rpc("mark_razorpay_payment_paid", {
    p_provider_order_id: razorpay_order_id,
    p_payment_id: razorpay_payment_id,
  });
  if (markError || !markedPaid) {
    console.error("Could not mark verified Razorpay payment paid", markError);
    return NextResponse.json({ error: "Payment was received but the order update needs attention. Please contact support." }, { status: 500 });
  }

  return NextResponse.json({ orderId: order.id });
}

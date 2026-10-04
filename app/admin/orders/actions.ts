"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";

const orderStatuses = ["Processing", "Shipped", "Delivered", "Cancelled"] as const;

export async function updateOrderStatusAction(formData: FormData) {
  const orderId = String(formData.get("orderId") ?? "");
  const status = String(formData.get("status") ?? "");
  const rawTrackingUrl = String(formData.get("trackingUrl") ?? "").trim();
  let trackingUrl: string | null = null;
  if (rawTrackingUrl) {
    try {
      const parsedUrl = new URL(rawTrackingUrl);
      if (parsedUrl.protocol !== "https:" || rawTrackingUrl.length > 2048) {
        throw new Error("invalid");
      }
      trackingUrl = parsedUrl.toString();
    } catch {
      throw new Error("Enter a valid courier tracking URL beginning with https://.");
    }
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    throw new Error("Invalid order ID.");
  }
  if (!orderStatuses.some((allowed) => allowed === status)) {
    throw new Error("Invalid order status.");
  }

  const { supabase, user } = await requireAdmin();
  const { data: current, error: readError } = await supabase
    .from("orders")
    .select("status,payment_method,payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (readError) throw new Error(`Unable to check order status: ${readError.message}`);
  if (!current) throw new Error("Order not found or admin access denied.");
  if (status === "Cancelled" && current.status !== "Processing") {
    throw new Error("Only orders that are still Processing can be cancelled. Contact support for a return.");
  }
  if (status === "Cancelled" && current.payment_method === "Razorpay") {
    throw new Error("Razorpay orders cannot be cancelled manually. Pending payments expire automatically; paid orders require a verified refund process.");
  }
  if (
    ["Shipped", "Delivered"].includes(status) &&
    current.payment_method === "Razorpay" &&
    current.payment_status !== "PAID"
  ) {
    throw new Error("This online order has not been confirmed as paid. Do not ship it until Razorpay payment is verified.");
  }
  const { data: order, error } = await supabase
    .from("orders")
    .update({ status, tracking_url: trackingUrl })
    .eq("id", orderId)
    .select("id,order_number,status,tracking_url")
    .maybeSingle();
  if (error) throw new Error(`Unable to update order: ${error.message}`);
  if (!order) throw new Error("Order not found or admin access denied.");

  const { error: logError } = await supabase.from("admin_logs").insert({
    admin_user_id: user.id,
    action: "order.status_changed",
    entity_type: "order",
    entity_id: order.id,
    metadata: { order_number: order.order_number, status: order.status, tracking_url: order.tracking_url },
  });
  if (logError) throw new Error(`Order updated, but audit logging failed: ${logError.message}`);
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath(`/orders/${orderId}`);
}

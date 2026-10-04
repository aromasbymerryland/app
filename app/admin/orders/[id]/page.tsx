import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateOrderStatusAction } from "@/app/admin/orders/actions";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = { title: "Order · Admin" };

type AdminOrderPageProps = { params: Promise<{ id: string }> };

export default async function AdminOrderPage({ params }: AdminOrderPageProps) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [orderResult, itemsResult] = await Promise.all([
    supabase.from("orders").select("id,order_number,customer_name,customer_email,customer_phone,shipping_address,city,state,pincode,subtotal,shipping_fee,total,payment_method,payment_status,status,tracking_url,created_at").eq("id", id).maybeSingle(),
    supabase.from("order_items").select("product_name,product_slug,product_snapshot,unit_price,quantity,total_price").eq("order_id", id),
  ]);
  if (orderResult.error) throw new Error(`Unable to load order: ${orderResult.error.message}`);
  if (itemsResult.error) throw new Error(`Unable to load order items: ${itemsResult.error.message}`);
  if (!orderResult.data) notFound();
  const order = orderResult.data;
  const formatPrice = (price: number | string) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(price));

  return (
    <>
      <header className="admin-page-heading"><div><Link className="admin-back-link" href="/admin/orders">← All orders</Link><span className="eyebrow">Order details</span><h1>{order.order_number}.</h1><p>Placed {new Date(order.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p></div></header>
      <div className="admin-order-layout">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><span className="eyebrow">In this parcel</span><h2>Order items</h2></div><span className="order-status">{order.payment_status === "PAID" ? "Paid" : order.payment_method === "Razorpay" ? "Payment pending" : "Pay on delivery"}</span></div>
          {(itemsResult.data ?? []).map((item, index) => <div className="admin-order-item" key={`${item.product_name}-${index}`}><div><strong>{item.product_name}</strong><small>{item.product_snapshot && typeof item.product_snapshot === "object" && "size" in item.product_snapshot ? String(item.product_snapshot.size) : ""} · Qty {item.quantity}</small></div><span>{formatPrice(item.total_price)}</span></div>)}
          <div className="admin-order-totals"><p><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></p><p><span>Shipping</span><strong>{Number(order.shipping_fee) === 0 ? "Complimentary" : formatPrice(order.shipping_fee)}</strong></p><p><span>Total · {order.payment_method}</span><strong>{formatPrice(order.total)}</strong></p></div>
        </section>
        <aside className="admin-panel admin-customer-panel"><span className="eyebrow">Going to</span><h2>{order.customer_name}</h2><p>{order.customer_email}</p><p>{order.customer_phone}</p><address>{order.shipping_address}<br />{order.city}, {order.state} {order.pincode}</address>
          <form action={updateOrderStatusAction} className="admin-status-form"><input type="hidden" name="orderId" value={order.id} /><label>Order status<select name="status" defaultValue={order.status}><option value="Processing">Processing</option><option value="Shipped" disabled={order.payment_method === "Razorpay" && order.payment_status !== "PAID"}>Shipped</option><option value="Delivered" disabled={order.payment_method === "Razorpay" && order.payment_status !== "PAID"}>Delivered</option><option value="Cancelled" disabled={order.payment_method === "Razorpay"}>Cancelled</option></select></label><label>Courier tracking URL<input type="url" name="trackingUrl" defaultValue={order.tracking_url ?? ""} maxLength={2048} placeholder="https://courier.example/track/..." /></label><p className="admin-status-note">Add the courier tracking link, usually when marking the order as Shipped. Unpaid Razorpay orders cannot be dispatched. Pending Razorpay orders expire automatically after 30 minutes; paid order cancellations require a refund workflow. Leave the link blank to hide tracking from the customer.</p>{order.payment_status === "REFUND_REQUIRED" && <p className="admin-status-note admin-payment-alert" role="alert">A payment was captured after this order was cancelled. Refund it in Razorpay and update the customer.</p>}<button className="button-dark" type="submit">Save order updates <span>→</span></button></form>
          {order.status === "Cancelled" && <p className="admin-status-note">Stock restoration is handled by the database trigger.</p>}
        </aside>
      </div>
    </>
  );
}

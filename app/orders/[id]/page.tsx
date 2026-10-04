import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductRatingForm } from "@/components/product-rating-form";
import { OrderInvoice, type OrderInvoiceData } from "@/components/order-invoice";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false } };

type OrderPageProps = { params: Promise<{ id: string }> };

export default async function OrderPage({ params }: OrderPageProps) {
  if (!isSupabaseConfigured()) redirect("/");
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) redirect("/login");

  const { data: order, error } = await supabase
    .from("orders")
    .select("id,order_number,status,tracking_url,subtotal,shipping_fee,total,payment_method,payment_status,created_at,customer_name,customer_email,customer_phone,shipping_address,city,state,pincode,invoice_seller_name,invoice_seller_address,invoice_seller_gstin,invoice_seller_state,invoice_gst_rate,invoice_tax_inclusive,invoice_tax_amount")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Unable to load the order: ${error.message}`);
  if (!order) notFound();

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id,product_id,product_name,unit_price,quantity,total_price")
    .eq("order_id", id);
  if (itemsError) throw new Error(`Unable to load the order items: ${itemsError.message}`);
  const itemIds = (items ?? []).map((item) => item.id);
  const { data: reviews, error: reviewsError } = itemIds.length
    ? await supabase.from("product_reviews").select("order_item_id,rating").in("order_item_id", itemIds)
    : { data: [], error: null };
  if (reviewsError) throw new Error(`Unable to load product ratings: ${reviewsError.message}`);
  const reviewedItemIds = new Set((reviews ?? []).map((review) => review.order_item_id));

  const formatPrice = (value: number | string) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value));

  return (
    <main className="order-page">
      <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
      <div className="order-confirmation-mark">✓</div>
      <span className="eyebrow">A lovely choice</span>
      <h1>{order.status === "Delivered" ? <>Your order has <em>arrived.</em></> : <>Your order is <em>on its way.</em></>}</h1>
      <p className="order-confirmation-copy">{order.status === "Delivered" ? "We hope you’re enjoying your fragrance. Share a star rating for each item below." : "Thank you for finding a place for us in your home. We’ll keep you posted as your order moves along."}</p>
      <section className="order-summary">
        <div className="order-summary-head"><span>ORDER</span><strong>{order.order_number}</strong><span className="order-status">{order.status}</span></div>
        {order.payment_method === "Razorpay" && order.payment_status !== "PAID" && (
          <p className="order-payment-pending">
            {order.payment_status === "REFUND_REQUIRED"
              ? "A payment was received after this order was cancelled. Please contact our Help desk about your refund."
              : "Your Razorpay payment is awaiting confirmation. If money was deducted, please don’t pay again; check back shortly or contact our Help desk."}
          </p>
        )}
        {order.tracking_url && (
          <div className="order-tracking">
            <span className="eyebrow">Follow your delivery</span>
            <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">Track your package <span aria-hidden="true">↗</span></a>
          </div>
        )}
        <div className="order-lines">
          {(items ?? []).map((item) => (
            <div className="order-line order-line-with-rating" key={item.id}>
              <div>
                <span>{item.product_name} <small>× {item.quantity}</small></span>
                {order.status === "Delivered" && item.product_id && (
                  reviewedItemIds.has(item.id)
                    ? <p className="product-rating-saved">Your rating: {"★".repeat(reviews?.find((review) => review.order_item_id === item.id)?.rating ?? 0)}</p>
                    : <ProductRatingForm orderItemId={item.id} productName={item.product_name} />
                )}
              </div>
              <strong>{formatPrice(item.total_price)}</strong>
            </div>
          ))}
        </div>
        <div className="order-line order-subtotal"><span>Subtotal</span><strong>{formatPrice(order.subtotal)}</strong></div>
        <div className="order-line"><span>Shipping</span><strong>{Number(order.shipping_fee) === 0 ? "Complimentary" : formatPrice(order.shipping_fee)}</strong></div>
        <div className="order-line order-total"><span>Total · {order.payment_method}{order.payment_method === "Razorpay" ? ` · ${order.payment_status === "PAID" ? "Paid" : order.payment_status === "REFUND_REQUIRED" ? "Refund required" : "Payment pending"}` : ""}</span><strong>{formatPrice(order.total)}</strong></div>
      </section>
      <OrderInvoice order={order as OrderInvoiceData} items={items ?? []} />
      <div className="order-actions"><Link href="/account">Your account <span>→</span></Link><Link href="/shop">Find another feeling <span>→</span></Link></div>
    </main>
  );
}

import { PrintInvoiceButton } from "@/components/print-invoice-button";

type InvoiceItem = {
  product_name: string;
  unit_price: number | string;
  quantity: number;
  total_price: number | string;
};

export type OrderInvoiceData = {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  shipping_address: string;
  city: string;
  state: string;
  pincode: string;
  subtotal: number | string;
  shipping_fee: number | string;
  total: number | string;
  payment_method: string;
  payment_status: string | null;
  invoice_seller_name: string | null;
  invoice_seller_address: string | null;
  invoice_seller_gstin: string | null;
  invoice_seller_state: string | null;
  invoice_gst_rate: number | string;
  invoice_tax_inclusive: boolean;
  invoice_tax_amount: number | string;
};

const stateCodes: Record<string, string> = {
  "jammu and kashmir": "01", "himachal pradesh": "02", punjab: "03", chandigarh: "04",
  uttarakhand: "05", haryana: "06", delhi: "07", rajasthan: "08", "uttar pradesh": "09",
  bihar: "10", sikkim: "11", "arunachal pradesh": "12", nagaland: "13", manipur: "14",
  mizoram: "15", tripura: "16", meghalaya: "17", assam: "18", "west bengal": "19",
  jharkhand: "20", odisha: "21", orissa: "21", chhattisgarh: "22", "madhya pradesh": "23",
  gujarat: "24", "dadra and nagar haveli and daman and diu": "26", maharashtra: "27",
  karnataka: "29", goa: "30", lakshadweep: "31", kerala: "32", tamilnadu: "33",
  "tamil nadu": "33", puducherry: "34", pondicherry: "34", "andaman and nicobar islands": "35",
  telangana: "36", "andhra pradesh": "37", ladakh: "38",
};

function formatPrice(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function stateCode(value: string | null) {
  const normalized = value?.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (/^\d{2}$/.test(normalized)) return normalized;
  return stateCodes[normalized] ?? null;
}

export function OrderInvoice({ order, items }: { order: OrderInvoiceData; items: InvoiceItem[] }) {
  const subtotal = Number(order.subtotal);
  const shipping = Number(order.shipping_fee);
  const total = Number(order.total);
  const tax = Number(order.invoice_tax_amount);
  const rate = Number(order.invoice_gst_rate);
  const hasTaxInvoiceDetails = Boolean(
    rate > 0 &&
    order.invoice_seller_name &&
    order.invoice_seller_address &&
    order.invoice_seller_gstin &&
    order.invoice_seller_state,
  );
  const sellerStateCode = order.invoice_seller_gstin?.slice(0, 2) ?? null;
  const buyerStateCode = stateCode(order.state);
  const sameState = sellerStateCode !== null && sellerStateCode === buyerStateCode;
  const taxableValue = order.invoice_tax_inclusive ? subtotal - tax : subtotal;
  const firstTaxPart = Math.round((tax / 2) * 100) / 100;
  const secondTaxPart = Math.round((tax - firstTaxPart) * 100) / 100;

  return (
    <section className="order-invoice">
      <div className="invoice-toolbar">
        <p>Use your browser’s print dialog to print or save this bill as a PDF.</p>
        <PrintInvoiceButton />
      </div>
      <header className="invoice-heading">
        <div>
          <span className="wordmark-main">AROMAS</span>
          <span className="wordmark-sub">BY MERRYLAND</span>
        </div>
        <div className="invoice-heading-title">
          <h2>{hasTaxInvoiceDetails ? "GST Tax Invoice" : "Order Receipt"}</h2>
          <p>{order.order_number}</p>
          <p>{new Date(order.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
        </div>
      </header>
      {!hasTaxInvoiceDetails && (
        <p className="invoice-not-configured">
          Tax registration details were not configured when this order was placed. This is an order receipt, not a GST tax invoice.
        </p>
      )}
      <div className="invoice-parties">
        <section>
          <h3>Seller</h3>
          <strong>{order.invoice_seller_name || "Aromas by Merryland"}</strong>
          {order.invoice_seller_address && <p>{order.invoice_seller_address}</p>}
          {order.invoice_seller_gstin && <p>GSTIN: {order.invoice_seller_gstin}</p>}
          {order.invoice_seller_state && <p>State: {order.invoice_seller_state}</p>}
        </section>
        <section>
          <h3>Bill to / Ship to</h3>
          <strong>{order.customer_name}</strong>
          <p>{order.shipping_address}</p>
          <p>{order.city}, {order.state} {order.pincode}</p>
          <p>{order.customer_phone}</p>
          {order.customer_email && <p>{order.customer_email}</p>}
        </section>
      </div>
      <table className="invoice-items">
        <thead><tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.product_name}-${index}`}>
              <td>{item.product_name}</td>
              <td>{item.quantity}</td>
              <td>{formatPrice(item.unit_price)}</td>
              <td>{formatPrice(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="invoice-totals">
        <div><span>Product subtotal</span><strong>{formatPrice(subtotal)}</strong></div>
        {hasTaxInvoiceDetails && (
          <>
            <div><span>Taxable value</span><strong>{formatPrice(taxableValue)}</strong></div>
            {sameState ? (
              <>
                <div><span>CGST ({(rate / 2).toFixed(2)}%)</span><strong>{formatPrice(firstTaxPart)}</strong></div>
                <div><span>SGST ({(rate / 2).toFixed(2)}%)</span><strong>{formatPrice(secondTaxPart)}</strong></div>
              </>
            ) : buyerStateCode && sellerStateCode ? (
              <div><span>IGST ({rate.toFixed(2)}%)</span><strong>{formatPrice(tax)}</strong></div>
            ) : (
              <div><span>GST ({rate.toFixed(2)}%)</span><strong>{formatPrice(tax)}</strong></div>
            )}
          </>
        )}
        <div><span>Shipping</span><strong>{shipping === 0 ? "Complimentary" : formatPrice(shipping)}</strong></div>
        <div className="invoice-grand-total"><span>Order total</span><strong>{formatPrice(total)}</strong></div>
        <div><span>Payment</span><strong>{order.payment_method}{order.payment_method === "Razorpay" ? ` · ${order.payment_status === "PAID" ? "Paid" : "Pending"}` : " · Pay on delivery"}</strong></div>
      </div>
      <p className="invoice-footer">Thank you for choosing Aromas by Merryland.</p>
    </section>
  );
}

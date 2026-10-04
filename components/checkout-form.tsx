"use client";

import Link from "next/link";
import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createOrderAction, type CheckoutState } from "@/app/checkout/actions";
import { RazorpaySetupCheck } from "@/components/razorpay-setup-check";
import type { RazorpaySetupIssue } from "@/lib/payments/razorpay-config";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

type CartEntry = { productId: string; quantity: number };

type RazorpayCheckoutResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: "INR";
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayCheckoutResponse) => void;
  modal: { ondismiss: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => { open: () => void };
  }
}

export function CheckoutForm({
  email,
  profileName,
  profilePhone,
  profileAddress,
  profileCity,
  profileState,
  profilePincode,
  checkoutKey,
  paymentMode,
  razorpayConfigured,
  razorpaySetupIssues,
}: {
  email: string;
  profileName: string;
  profilePhone: string;
  profileAddress: string;
  profileCity: string;
  profileState: string;
  profilePincode: string;
  checkoutKey: string;
  paymentMode: "test" | "live";
  razorpayConfigured: boolean;
  razorpaySetupIssues: RazorpaySetupIssue[];
}) {
  const [cart, setCart] = useLocalStorageState<CartEntry[]>("merryland-cart", []);
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(createOrderAction, {});
  const router = useRouter();
  const launchedPaymentOrder = useRef("");
  const [paymentError, setPaymentError] = useState("");
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cod" | "razorpay">("cod");

  useEffect(() => {
    if (state.orderId) {
      setCart([]);
      router.replace(`/orders/${state.orderId}`);
    }
  }, [router, setCart, state.orderId]);

  useEffect(() => {
    if (state.refreshCheckout) router.refresh();
  }, [router, state.refreshCheckout]);

  useEffect(() => {
    const payment = state.payment;
    if (!payment || !razorpayReady || !window.Razorpay || launchedPaymentOrder.current === payment.providerOrderId) return;
    launchedPaymentOrder.current = payment.providerOrderId;
    setPaymentError("");
    const checkout = new window.Razorpay({
      key: payment.keyId,
      amount: payment.amount,
      currency: "INR",
      name: "Aromas by Merryland",
      description: "Your fragrance order",
      order_id: payment.providerOrderId,
      prefill: {
        name: payment.customerName,
        email: payment.customerEmail,
        contact: payment.customerPhone,
      },
      theme: { color: "#491629" },
      handler: async (response) => {
        setVerifyingPayment(true);
        setPaymentError("");
        try {
          const verification = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appOrderId: payment.appOrderId, ...response }),
          });
          const result: unknown = await verification.json();
          if (
            !verification.ok ||
            !result ||
            typeof result !== "object" ||
            !("orderId" in result) ||
            typeof result.orderId !== "string"
          ) {
            const message = result && typeof result === "object" && "error" in result && typeof result.error === "string"
              ? result.error
              : "We couldn’t verify your payment. Please check your order before trying again.";
            setPaymentError(message);
            return;
          }
          setCart([]);
          router.replace(`/orders/${result.orderId}`);
        } catch (error) {
          console.error("Payment verification request failed", error);
          setPaymentError("We couldn’t contact the payment verifier. Your order is still available in your account.");
        } finally {
          setVerifyingPayment(false);
          launchedPaymentOrder.current = "";
        }
      },
      modal: {
        ondismiss: () => {
          launchedPaymentOrder.current = "";
          setPaymentError("Payment wasn’t completed. Your bag is still saved; you can try checkout again.");
        },
      },
    });
    checkout.open();
  }, [razorpayReady, router, setCart, state.payment]);

  const databaseItems = cart.map(({ productId, quantity }) => ({
    product_id: productId,
    quantity,
  }));

  if (!databaseItems.length) {
    return (
      <div className="checkout-empty">
        <p>Your bag is empty for now.</p>
        <Link href="/shop" className="button-dark">Find a fragrance <span>→</span></Link>
      </div>
    );
  }

  return (
    <>
    {razorpayConfigured && <Script
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
      onReady={() => setRazorpayReady(true)}
      onError={() => setPaymentError("Online checkout couldn’t load. Please refresh or choose Cash on delivery.")}
    />}
    <form action={formAction} className="checkout-form">
      <input type="hidden" name="items" value={JSON.stringify(databaseItems)} />
      <input type="hidden" name="checkoutKey" value={checkoutKey} />
      <div className="checkout-section">
        <span className="eyebrow">01 · The essentials</span>
        <h2>Where should we send it?</h2>
        <p className="checkout-email">{email}</p>
        <p className="checkout-saved-details">Need to update your saved details? <Link href="/account">Manage your account</Link></p>
        <div className="checkout-fields">
          <label>Full name<input name="customerName" defaultValue={profileName} autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label>Phone number<input name="customerPhone" defaultValue={profilePhone} type="tel" autoComplete="tel" minLength={7} maxLength={20} required /></label>
          <label className="checkout-wide">Street address<input name="shippingAddress" defaultValue={profileAddress} autoComplete="street-address" minLength={8} maxLength={500} required /></label>
          <label>City<input name="city" defaultValue={profileCity} autoComplete="address-level2" minLength={2} maxLength={100} required /></label>
          <label>State<input name="state" defaultValue={profileState} autoComplete="address-level1" minLength={2} maxLength={100} required /></label>
          <label>PIN code<input name="pincode" defaultValue={profilePincode} inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{6}" maxLength={6} required /></label>
        </div>
      </div>
      <div className="checkout-section payment-section">
        <span className="eyebrow">02 · Payment</span>
        <h2>Choose how to pay.</h2>
        <label className="payment-choice"><input type="radio" name="paymentMethod" value="cod" checked={selectedPaymentMethod === "cod"} onChange={() => setSelectedPaymentMethod("cod")} /><span><strong>Cash on delivery</strong><small>Pay when your order arrives.</small></span></label>
        <label className="payment-choice"><input type="radio" name="paymentMethod" value="razorpay" checked={selectedPaymentMethod === "razorpay"} disabled={!razorpayConfigured} onChange={() => setSelectedPaymentMethod("razorpay")} /><span><strong>Online payment · Razorpay</strong><small>{razorpayConfigured ? "UPI, cards, net banking and other available methods." : "Not configured yet."}</small></span></label>
        {razorpayConfigured
          ? <p className="checkout-payment-note">{paymentMode === "test" ? "Razorpay is in test mode. Payments are simulated and no real money will be charged." : "Your payment is securely processed by Razorpay."}</p>
          : <p className="checkout-payment-note">Online payment setup is incomplete. You can still place a Cash on delivery order.</p>}
        {razorpayConfigured ? (
          <details className="razorpay-setup-details">
            <summary>Having trouble with online payment?</summary>
            <RazorpaySetupCheck initialIssues={razorpaySetupIssues} />
          </details>
        ) : <RazorpaySetupCheck initialIssues={razorpaySetupIssues} />}
      </div>
      {state.error && <p className="checkout-error" role="alert">{state.error}</p>}
      {paymentError && <p className="checkout-error" role="alert">{paymentError}</p>}
      {verifyingPayment && <p className="checkout-payment-note" role="status">Confirming your payment securely…</p>}
      {state.debug && process.env.NODE_ENV === "development" && (
        <pre className="checkout-debug" role="status">{state.debug}</pre>
      )}
      <button type="submit" className="button-dark checkout-submit" disabled={pending || verifyingPayment || Boolean(state.payment && !paymentError)}>
        {pending ? "Preparing secure checkout…" : verifyingPayment ? "Confirming payment…" : selectedPaymentMethod === "razorpay" ? "Continue to online payment" : "Place order · Cash on delivery"}<span>→</span>
      </button>
      <p className="checkout-terms">Your total is calculated securely using the latest catalog prices and shipping settings.</p>
    </form>
    </>
  );
}

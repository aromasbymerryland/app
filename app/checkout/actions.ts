"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getRazorpayConfiguration,
  getRazorpaySetupIssues,
  type RazorpaySetupIssue,
} from "@/lib/payments/razorpay-config";

export type RazorpaySetupCheck = {
  label: string;
  ok: boolean;
  message: string;
};

export type RazorpaySetupState = {
  issues?: RazorpaySetupIssue[];
  checks?: RazorpaySetupCheck[];
  error?: string;
};

export type CheckoutState = {
  error?: string;
  debug?: string;
  orderId?: string;
  refreshCheckout?: boolean;
  payment?: {
    appOrderId: string;
    providerOrderId: string;
    keyId: string;
    amount: number;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
  };
};

type CheckoutItem = { product_id: string; quantity: number };

export async function checkRazorpaySetupAction(
  _previousState: RazorpaySetupState,
): Promise<RazorpaySetupState> {
  void _previousState;
  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: "Sign in before checking payment setup." };

  const issues = getRazorpaySetupIssues();
  if (issues.length) return { issues };

  const razorpay = getRazorpayConfiguration();
  if (!razorpay) return { issues: [{ setting: "Razorpay setup", message: "Configuration is incomplete; review the required environment variables." }] };

  const checks: RazorpaySetupCheck[] = [
    { label: "RAZORPAY_KEY_ID format", ok: true, message: `Prefix matches ${razorpay.mode} mode.` },
    { label: "RAZORPAY_WEBHOOK_SECRET", ok: true, message: "Present. Confirm it exactly matches the secret saved in the Razorpay webhook settings." },
  ];

  try {
    const response = await fetch("https://api.razorpay.com/v1/orders?count=1", {
      headers: {
        Authorization: `Basic ${Buffer.from(`${razorpay.keyId}:${razorpay.keySecret}`).toString("base64")}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    await response.body?.cancel();
    if (response.ok) {
      checks.push({ label: "Razorpay API credentials", ok: true, message: `Razorpay accepted the key pair in ${razorpay.mode} mode.` });
    } else if (response.status === 401) {
      checks.push({ label: "Razorpay API credentials", ok: false, message: "Razorpay rejected this Key ID/Key Secret pair. Check that they were generated together in the selected mode." });
    } else {
      checks.push({ label: "Razorpay API credentials", ok: false, message: `Razorpay returned HTTP ${response.status}. Check account access and try again.` });
    }
  } catch (error) {
    console.error("Razorpay setup diagnostic request failed", error);
    checks.push({ label: "Razorpay API connection", ok: false, message: "Could not reach Razorpay. Check the deployment’s network access and try again." });
  }

  try {
    const admin = createSupabaseAdminClient();
    const { error: databaseError } = await admin.from("orders").select("id").limit(1);
    if (!databaseError) {
      checks.push({ label: "Supabase service-role key", ok: true, message: "Key was accepted and the orders table is accessible." });
    } else if (databaseError.code === "PGRST205" || databaseError.code === "42P01") {
      checks.push({ label: "Supabase database", ok: false, message: "The orders table was not found. Check the Supabase migrations." });
    } else if (databaseError.code === "401" || databaseError.code === "403" || databaseError.code === "PGRST301") {
      checks.push({ label: "Supabase service-role key", ok: false, message: "Supabase rejected the key. Check that this is the server-side service-role/secret key for this project." });
    } else {
      console.error("Supabase setup diagnostic query failed", { code: databaseError.code });
      checks.push({ label: "Supabase database", ok: false, message: "The database check failed. Verify the Supabase URL, server key, and database status." });
    }

    const { error: rpcError } = await admin.rpc("create_razorpay_checkout_order", {
      p_items: [],
      p_customer_name: "",
      p_customer_phone: "",
      p_shipping_address: "",
      p_city: "",
      p_state: "",
      p_pincode: "",
      p_checkout_key: null,
    });
    if (rpcError?.code === "PGRST202") {
      checks.push({ label: "Razorpay database migration", ok: false, message: "The checkout function is missing from Supabase. Apply the latest 010 migration." });
    } else if (rpcError?.code === "PGRST203") {
      checks.push({ label: "Razorpay database migration", ok: false, message: "Supabase found an ambiguous checkout function. Check the installed migrations." });
    } else {
      checks.push({ label: "Razorpay database migration", ok: true, message: "The checkout function is installed." });
    }

    const { error: paymentMethodError } = await admin.rpc("claim_checkout_payment_method", {
      p_checkout_key: null,
      p_payment_method: "Razorpay",
    });
    if (paymentMethodError?.code === "PGRST202" || paymentMethodError?.code === "PGRST203") {
      checks.push({ label: "Updated 010 migration", ok: false, message: "The payment-method protection function is missing. Rerun the latest 010 migration in Supabase." });
    } else {
      checks.push({ label: "Updated 010 migration", ok: true, message: "The payment-method protection function is installed." });
    }
  } catch (error) {
    console.error("Supabase setup diagnostic request failed", error);
    checks.push({ label: "Supabase service-role key", ok: false, message: "Could not initialize the Supabase server client. Check the server key and project URL." });
  }

  return { checks };
}

export async function createOrderAction(
  _previousState: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const itemsText = String(formData.get("items") ?? "");
  let items: CheckoutItem[];
  try {
    const parsed: unknown = JSON.parse(itemsText);
    if (
      !Array.isArray(parsed) ||
      parsed.length < 1 ||
      parsed.length > 25 ||
      !parsed.every(
        (item): item is CheckoutItem =>
          typeof item === "object" &&
          item !== null &&
          "product_id" in item &&
          typeof item.product_id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.product_id) &&
          "quantity" in item &&
          Number.isInteger(item.quantity) &&
          item.quantity >= 1 &&
          item.quantity <= 10,
      )
    ) {
      return { error: "Your bag has an invalid item. Please return to your bag and try again." };
    }
    items = parsed;
  } catch {
    return { error: "Your bag could not be read. Please return to your bag and try again." };
  }

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const shippingAddress = String(formData.get("shippingAddress") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const pincode = String(formData.get("pincode") ?? "").trim();
  const checkoutKey = String(formData.get("checkoutKey") ?? "");
  if (
    customerName.length < 2 ||
    customerName.length > 100 ||
    !/^[0-9+() -]{7,20}$/.test(customerPhone) ||
    shippingAddress.length < 8 ||
    shippingAddress.length > 500 ||
    city.length < 2 ||
    city.length > 100 ||
    state.length < 2 ||
    state.length > 100 ||
    !/^[0-9]{6}$/.test(pincode) ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(checkoutKey)
  ) {
    return { error: "Check your delivery details and try again. Please enter a valid six-digit PIN code." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return { error: "Please sign in before placing your order." };

  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  if (paymentMethod === "razorpay") {
    const cancelPendingOrder = async (orderId: string) => {
      const { data: cancelled, error: cancelError } = await supabase.rpc("cancel_pending_razorpay_order", {
        p_app_order_id: orderId,
      });
      if (cancelError || !cancelled) {
        console.error("Could not release stock for failed Razorpay setup", cancelError);
      }
    };
    const retryAfterRefresh = (error: string): CheckoutState => ({
      error: `${error} Checkout has been reset so you can safely try again.`,
      refreshCheckout: true,
    });
    const razorpay = getRazorpayConfiguration();
    if (!razorpay) {
      return { error: "Online payment is not configured for the selected mode. Please choose Cash on delivery or contact the store." };
    }
    const { keyId, keySecret } = razorpay;

    const { data: checkoutOrders, error: checkoutError } = await supabase.rpc("create_razorpay_checkout_order", {
      p_items: items,
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_shipping_address: shippingAddress,
      p_city: city,
      p_state: state,
      p_pincode: pincode,
      p_checkout_key: checkoutKey,
    });
    if (checkoutError) {
      console.error("Razorpay checkout order creation failed", checkoutError);
      return {
        error: checkoutError.code === "PGRST202"
          ? "Online payment setup is incomplete. Apply the Razorpay checkout migration and try again."
          : "We couldn’t start online checkout. Please try again or choose Cash on delivery.",
      };
    }
    const checkoutOrder = Array.isArray(checkoutOrders) ? checkoutOrders[0] : null;
    if (
      !checkoutOrder?.app_order_id ||
      !checkoutOrder.app_order_number ||
      checkoutOrder.total_amount === null ||
      checkoutOrder.total_amount === undefined
    ) {
      throw new Error("Online checkout did not return a valid order.");
    }

    const amount = Math.round(Number(checkoutOrder.total_amount) * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) {
      await cancelPendingOrder(checkoutOrder.app_order_id);
      return retryAfterRefresh("Online payments require an order total of at least ₹1. Please choose Cash on delivery.");
    }

    let providerOrderId: string | null = typeof checkoutOrder.provider_order_id === "string"
      ? checkoutOrder.provider_order_id
      : null;
    if (!providerOrderId) {
      let providerResponse: Response;
      try {
        providerResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount,
            currency: "INR",
            receipt: checkoutOrder.app_order_number,
            notes: { app_order_id: checkoutOrder.app_order_id },
          }),
          cache: "no-store",
          signal: AbortSignal.timeout(15000),
        });
      } catch (providerError) {
        console.error("Razorpay order request failed", providerError);
        await cancelPendingOrder(checkoutOrder.app_order_id);
        return retryAfterRefresh("We couldn’t connect to online payments. Your bag is still saved.");
      }

      const providerData: unknown = await providerResponse.json().catch((parseError: unknown) => {
        console.error("Could not read Razorpay order response", parseError);
        return null;
      });
      if (
        !providerResponse.ok ||
        !providerData ||
        typeof providerData !== "object" ||
        !("id" in providerData) ||
        typeof providerData.id !== "string" ||
        !/^order_[A-Za-z0-9]+$/.test(providerData.id) ||
        !("amount" in providerData) ||
        providerData.amount !== amount ||
        !("currency" in providerData) ||
        providerData.currency !== "INR"
      ) {
        console.error("Razorpay rejected order creation", { status: providerResponse.status });
        await cancelPendingOrder(checkoutOrder.app_order_id);
        return retryAfterRefresh("Online payment setup failed. Your bag is still saved; you can choose Cash on delivery.");
      }
      providerOrderId = providerData.id;
      const { data: attached, error: attachError } = await supabase.rpc("attach_razorpay_order", {
        p_app_order_id: checkoutOrder.app_order_id,
        p_provider_order_id: providerOrderId,
      });
      if (attachError || !attached) {
        console.error("Unable to attach Razorpay order", attachError);
        await cancelPendingOrder(checkoutOrder.app_order_id);
        return retryAfterRefresh("We couldn’t prepare online checkout. Your bag is still saved.");
      }
    }

    return {
      payment: {
        appOrderId: checkoutOrder.app_order_id,
        providerOrderId,
        keyId,
        amount,
        customerName,
        customerEmail: userData.user.email ?? "",
        customerPhone,
      },
    };
  }
  if (paymentMethod !== "cod") return { error: "Choose a valid payment method." };

  const { data: orderId, error } = await supabase.rpc("create_cod_checkout_order", {
    p_items: items,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
    p_shipping_address: shippingAddress,
    p_city: city,
    p_state: state,
    p_pincode: pincode,
    p_checkout_key: checkoutKey,
  });
  if (error) {
    const message = error.message;
    if (message.includes("checkout_payment_method_mismatch")) {
      return { error: "Your checkout is already using another payment method. Refresh checkout and try again." };
    }
    if (message.includes("stock_unavailable")) {
      return { error: "One or more fragrances are no longer available in that quantity. Please update your bag." };
    }
    if (message.includes("address_invalid")) {
      return { error: "Check your delivery details and try again." };
    }
    if (message.includes("authentication_required")) {
      return { error: "Your session has expired. Please sign in again." };
    }
    if (message.includes("cart_invalid")) {
      return { error: "Your bag has changed. Please review it and try again." };
    }
    if (error.code === "PGRST202") {
      return { error: "Secure checkout is not enabled yet. Apply the checkout database migration and try again." };
    }
    console.error("Checkout order creation failed", error);
    return {
      error: "We couldn’t place your order just now. Please try again.",
      ...(process.env.NODE_ENV === "development"
        ? {
            debug: [
              `Database code: ${error.code}`,
              `Message: ${error.message}`,
              error.details ? `Details: ${error.details}` : "",
              error.hint ? `Hint: ${error.hint}` : "",
            ].filter(Boolean).join("\n"),
          }
        : {}),
    };
  }
  if (!orderId) throw new Error("Checkout completed without returning an order ID.");
  const { data: savedOrder, error: savedOrderError } = await supabase
    .from("orders")
    .select("payment_method")
    .eq("id", orderId)
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (savedOrderError) throw new Error(`Unable to confirm checkout payment method: ${savedOrderError.message}`);
  if (!savedOrder || savedOrder.payment_method !== "Cash on Delivery") {
    return { error: "This checkout already has online payment pending. Complete that payment or refresh checkout to start a new order." };
  }
  return { orderId };
}

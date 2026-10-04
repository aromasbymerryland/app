"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProductRatingState = { error?: string; success?: string };

export async function submitProductRatingAction(
  _previousState: ProductRatingState,
  formData: FormData,
): Promise<ProductRatingState> {
  const orderItemId = String(formData.get("orderItemId") ?? "");
  const rating = Number(formData.get("rating"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderItemId)) {
    return { error: "We couldn’t identify this purchased item. Refresh the page and try again." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Choose a rating from 1 to 5 stars." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return { error: "Please sign in to rate a product." };

  const { data: item, error: itemError } = await supabase
    .from("order_items")
    .select("id,order_id,product_id")
    .eq("id", orderItemId)
    .maybeSingle();
  if (itemError) throw new Error(`Unable to verify the delivered order item: ${itemError.message}`);
  if (!item?.product_id) return { error: "This item is not eligible for a product rating." };

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id")
    .eq("id", item.order_id)
    .eq("user_id", authData.user.id)
    .eq("status", "Delivered")
    .maybeSingle();
  if (orderError) throw new Error(`Unable to verify the delivered order: ${orderError.message}`);
  if (!order) return { error: "Only items in delivered orders can be rated." };

  const { error: insertError } = await supabase
    .from("product_reviews")
    .insert({ order_item_id: item.id, rating });
  if (insertError) {
    if (insertError.code === "23505") return { error: "You’ve already rated this item." };
    console.error("Product rating submission failed", insertError);
    return { error: "We couldn’t save your rating. Please try again." };
  }

  revalidatePath(`/orders/${order.id}`);
  revalidatePath("/account/orders");
  revalidatePath("/");
  revalidatePath("/shop");
  return { success: "Thank you. Your star rating has been saved." };
}

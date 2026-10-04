"use client";

import { useActionState } from "react";
import {
  submitProductRatingAction,
  type ProductRatingState,
} from "@/app/reviews/actions";

export function ProductRatingForm({
  orderItemId,
  productName,
}: {
  orderItemId: string;
  productName: string;
}) {
  const [state, formAction, pending] = useActionState<ProductRatingState, FormData>(
    submitProductRatingAction,
    {},
  );

  return (
    <form action={formAction} className="product-rating-form">
      <input type="hidden" name="orderItemId" value={orderItemId} />
      <fieldset disabled={pending} aria-label={`Rate ${productName}`}>
        <legend>Rate this item</legend>
        <div className="product-rating-stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} title={`${value} ${value === 1 ? "star" : "stars"}`}>
              <input type="radio" name="rating" value={value} required />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">{value} {value === 1 ? "star" : "stars"}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <p className="product-rating-message product-rating-error" role="alert">{state.error}</p>}
      {state.success && <p className="product-rating-message product-rating-success" role="status">{state.success}</p>}
      <button className="button-dark" type="submit" disabled={pending}>{pending ? "Saving…" : "Submit rating"} <span>→</span></button>
    </form>
  );
}

"use client";

export function PrintInvoiceButton() {
  return (
    <button className="button-dark invoice-print-button" type="button" onClick={() => window.print()}>
      Print / save as PDF <span aria-hidden="true">↓</span>
    </button>
  );
}

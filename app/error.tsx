"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Storefront rendering error", error);
  }, [error]);

  return (
    <main className="status-page">
      <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
      <span className="eyebrow">A small pause</span>
      <h1>We’ll be right<br /><em>back with you.</em></h1>
      <p>Something didn’t load as expected. Your saved bag is still here; try again in a moment.</p>
      <button type="button" className="button-dark" onClick={retry}>Try again <span>→</span></button>
    </main>
  );
}

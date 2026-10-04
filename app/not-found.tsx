import Link from "next/link";

export default function NotFound() {
  return (
    <main className="status-page">
      <Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link>
      <span className="eyebrow">A little detour</span>
      <h1>We can’t find<br /><em>that feeling.</em></h1>
      <p>The page you’re looking for may have moved. Let’s find another lovely one.</p>
      <Link href="/shop" className="button-dark">Explore the collection <span>→</span></Link>
    </main>
  );
}

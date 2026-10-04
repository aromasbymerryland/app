type PageLoadingProps = {
  view: "home" | "shop";
};

export function PageLoading({ view }: PageLoadingProps) {
  const productCount = view === "home" ? 4 : 8;

  return (
    <main className={`page-loading page-loading-${view}`} role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">
        {view === "home" ? "Loading Aromas by Merryland" : "Loading fragrances"}
      </span>
      <div className="page-loading-header">
        <span className="loading-block loading-logo" />
        <span className="loading-block loading-nav" />
        <span className="loading-block loading-actions" />
      </div>
      {view === "home" ? (
        <>
          <div className="loading-hero">
            <div className="loading-hero-copy">
              <span className="loading-block loading-kicker" />
              <span className="loading-block loading-title" />
              <span className="loading-block loading-title loading-title-short" />
              <span className="loading-block loading-description" />
              <span className="loading-block loading-button" />
            </div>
          </div>
          <div className="loading-section">
            <span className="loading-block loading-section-label" />
            <div className="loading-product-grid">
              {Array.from({ length: productCount }, (_, index) => (
                <div className="loading-product" key={index}>
                  <span className="loading-block loading-product-image" />
                  <span className="loading-block loading-line loading-line-short" />
                  <span className="loading-block loading-line" />
                  <span className="loading-block loading-line loading-line-price" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="loading-section loading-shop">
          <span className="loading-block loading-kicker loading-center" />
          <span className="loading-block loading-shop-title" />
          <span className="loading-block loading-description loading-center" />
          <div className="loading-shop-tools">
            <span className="loading-block loading-filter" />
            <span className="loading-block loading-filter" />
            <span className="loading-block loading-filter" />
            <span className="loading-block loading-search" />
          </div>
          <div className="loading-product-grid">
            {Array.from({ length: productCount }, (_, index) => (
              <div className="loading-product" key={index}>
                <span className="loading-block loading-product-image" />
                <span className="loading-block loading-line loading-line-short" />
                <span className="loading-block loading-line" />
                <span className="loading-block loading-line loading-line-price" />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

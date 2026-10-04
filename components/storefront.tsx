"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import {
  defaultCategories,
  defaultStoreSettings,
  type Category,
  type Product,
  type StoreSettings,
} from "@/lib/catalog";
import { useLocalStorageState } from "@/lib/use-local-storage-state";

type CartEntry = { productId: string; quantity: number };

function ProductGallery({ product }: { product: Product }) {
  const images =
    product.images.length > 0
      ? product.images
      : [{ imageUrl: product.image, altText: product.imageAlt, isPrimary: true }];
  const [selected, setSelected] = useState(0);
  const selectedIndex = Math.min(selected, images.length - 1);
  const current = images[selectedIndex];

  return (
    <div className="product-gallery">
      <div className="detail-image" style={{ backgroundColor: product.colorPrimary }}>
        <Image
          src={current.imageUrl}
          alt={current.altText}
          fill
          priority
          sizes="(max-width: 800px) 100vw, 55vw"
          unoptimized={!current.imageUrl.startsWith("/")}
        />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        {images.length > 1 && <span className="gallery-counter">{String(selectedIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span>}
      </div>
      {images.length > 1 && (
        <div className="gallery-thumbnails" aria-label="Product images">
          {images.map((image, index) => (
            <button
              key={`${image.imageUrl}-${index}`}
              type="button"
              className={`gallery-thumbnail${selectedIndex === index ? " is-selected" : ""}`}
              onClick={() => setSelected(index)}
              aria-label={`Show product image ${index + 1}`}
              aria-pressed={selectedIndex === index}
            >
              <Image src={image.imageUrl} alt="" fill sizes="88px" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

function ProductCard({
  product,
  onAdd,
  saved,
  onWishlist,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  saved: boolean;
  onWishlist: (product: Product) => void;
}) {
  return (
    <article className="product-card">
      <div className="product-visual" style={{ backgroundColor: product.colorPrimary }}>
        <Link href={`/shop/${product.slug}`} className="product-image-link" aria-label={`View ${product.name}`}>
          <Image src={product.image} alt={product.imageAlt} fill sizes="(max-width: 700px) 82vw, (max-width: 1100px) 40vw, 25vw" unoptimized={!product.image.startsWith("/")} />
        </Link>
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <button
          className={`wishlist-button${saved ? " is-saved" : ""}`}
          type="button"
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          onClick={() => onWishlist(product)}
        >
          <Heart size={17} fill={saved ? "currentColor" : "none"} strokeWidth={1.6} />
        </button>
        <button className="quick-add" type="button" onClick={() => onAdd(product)} disabled={!product.inStock}>
          {product.inStock ? <>Add to bag <Plus size={15} /></> : "Sold out"}
        </button>
      </div>
      <div className="product-info">
        <div className="product-meta">
          <span>{product.category}</span>
          <span className="rating">{product.reviewCount > 0 ? `★ ${product.rating.toFixed(1)}` : "No ratings yet"}</span>
        </div>
        <Link href={`/shop/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        <p>{product.fragranceFamily}</p>
        <div className="product-price">
          <span>{formatPrice(product.price)}</span>
          {product.originalPrice && <del>{formatPrice(product.originalPrice)}</del>}
        </div>
      </div>
    </article>
  );
}

export function Storefront({
  products,
  isPreview = false,
  detailProduct,
  shopOnly = false,
  contactOnly = false,
  settings = defaultStoreSettings,
  categories = defaultCategories,
}: {
  products: Product[];
  isPreview?: boolean;
  detailProduct?: Product;
  shopOnly?: boolean;
  contactOnly?: boolean;
  settings?: StoreSettings;
  categories?: Category[];
}) {
  const [cart, setCart] = useLocalStorageState<CartEntry[]>("merryland-cart", []);
  const [wishlist, setWishlist] = useLocalStorageState<string[]>("merryland-wishlist", []);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [notice, setNotice] = useState("");

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = category === "All" || product.category === category;
        const haystack = `${product.name} ${product.category} ${product.fragranceFamily}`.toLowerCase();
        return matchesCategory && haystack.includes(query.trim().toLowerCase());
      }),
    [category, products, query],
  );

  const cartProducts = cart
    .map((item) => ({ item, product: products.find((product) => product.id === item.productId) }))
    .filter((entry): entry is { item: CartEntry; product: Product } => Boolean(entry.product));
  const cartCount = cart.reduce((count, item) => count + item.quantity, 0);
  const cartTotal = cartProducts.reduce((total, { item, product }) => total + item.quantity * product.price, 0);

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      return existing
        ? current.map((item) =>
            item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...current, { productId: product.id, quantity: 1 }];
    });
    setNotice(`${product.name} added to your bag`);
    setCartOpen(true);
  }

  function changeQuantity(productId: string, amount: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + amount } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function toggleWishlist(product: Product) {
    const exists = wishlist.includes(product.id);
    setNotice(exists ? `${product.name} removed from wishlist` : `${product.name} saved for later`);
    setWishlist((current) => {
      return exists ? current.filter((id) => id !== product.id) : [...current, product.id];
    });
  }

  const productGrid = (items: Product[]) => (
    <div className="product-grid">
      {items.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={addToCart}
          saved={wishlist.includes(product.id)}
          onWishlist={toggleWishlist}
        />
      ))}
    </div>
  );

  return (
    <div className="store-shell">
      <div className="announcement">{settings.announcementBar}</div>
      {isPreview && (
        <div className="preview-note">
          Preview catalog · Add your Supabase project credentials to load live products.
        </div>
      )}
      <header className="site-header">
        <button className="icon-button mobile-menu-trigger" type="button" aria-label="Open menu" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Link href="/" className="wordmark" aria-label="Aromas by Merryland home">
          <Image
            src="/merryland-brand-emblem.png"
            alt=""
            width={46}
            height={46}
            className="site-wordmark-logo"
          />
          <span className="site-wordmark-copy">
            <span className="wordmark-main">AROMAS</span>
            <span className="wordmark-sub">BY MERRYLAND</span>
          </span>
        </Link>
        <nav className={`main-nav${mobileMenuOpen ? " mobile-open" : ""}`} aria-label="Main navigation">
          <Link href="/shop" onClick={() => setMobileMenuOpen(false)}>Shop <ChevronDown size={12} /></Link>
          <Link href="/#story" onClick={() => setMobileMenuOpen(false)}>Our story</Link>
          <Link href="/#why-us" onClick={() => setMobileMenuOpen(false)}>Why Merryland</Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
        </nav>
        <div className="header-actions">
          <button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen(!searchOpen)}>
            {searchOpen ? <X size={19} /> : <Search size={19} />}
          </button>
          <Link className="icon-button account-link" href="/account" aria-label="Your account"><span>Account</span></Link>
          <button className="icon-button bag-trigger" type="button" aria-label={`Shopping bag with ${cartCount} items`} onClick={() => setCartOpen(true)}>
            <ShoppingBag size={19} /><span>Bag</span><b>{cartCount}</b>
          </button>
        </div>
      </header>

      {searchOpen && (
        <div className="search-panel">
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find your fragrance..." aria-label="Search fragrances" />
          {query && <button type="button" onClick={() => setQuery("")}>Clear</button>}
          <a href={shopOnly ? "#collection-results" : "#shop"} onClick={() => setSearchOpen(false)} aria-label="Go to search results"><ArrowRight size={18} /></a>
        </div>
      )}

      {detailProduct ? (
        <>
        <main className="detail-main">
          <div className="breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/shop">Shop</Link><span>/</span><span>{detailProduct.name}</span></div>
          <div className="detail-layout">
            <ProductGallery product={detailProduct} />
            <div className="detail-copy">
              <span className="eyebrow">{detailProduct.category} · {detailProduct.fragranceFamily}</span>
              <h1>{detailProduct.name}</h1>
              <div className="detail-rating">
                {detailProduct.reviewCount > 0
                  ? <><span>★ {detailProduct.rating.toFixed(1)}</span> · {detailProduct.reviewCount} customer ratings</>
                  : "No customer ratings yet"}
              </div>
              <p className="detail-description">{detailProduct.fullDescription}</p>
              <div className="detail-prices"><strong>{formatPrice(detailProduct.price)}</strong>{detailProduct.originalPrice && <del>{formatPrice(detailProduct.originalPrice)}</del>}</div>
              <div className="detail-size"><span>Size</span><button type="button">{detailProduct.size}<Check size={14} /></button></div>
              <button className="button-dark detail-add" type="button" onClick={() => addToCart(detailProduct)} disabled={!detailProduct.inStock}>
                {detailProduct.inStock ? <>Add to bag <span>{formatPrice(detailProduct.price)}</span></> : "Currently unavailable"}
              </button>
              <p className="availability"><span /> {detailProduct.inStock ? "In stock · Ready to find its place" : "Currently unavailable"}</p>
              <div className="notes-box">
                <div><span>Top notes</span><p>{detailProduct.fragranceNotes.top.join(" · ") || "A beautiful first impression"}</p></div>
                <div><span>Heart notes</span><p>{detailProduct.fragranceNotes.heart.join(" · ") || "The soul of the fragrance"}</p></div>
                <div><span>Base notes</span><p>{detailProduct.fragranceNotes.base.join(" · ") || "A lasting, lovely finish"}</p></div>
              </div>
              <div className="detail-features">
                {detailProduct.features.map((feature) => <span key={feature}><Check size={14} />{feature}</span>)}
              </div>
            </div>
          </div>
        </main>
        {products.some((product) => product.id !== detailProduct.id && product.category === detailProduct.category) && (
          <section className="related-products">
            <div className="section-heading"><div><span className="eyebrow">Stay awhile</span><h2>More to <em>discover.</em></h2></div><Link href="/shop" className="text-link">Shop all fragrances <ArrowRight size={15} /></Link></div>
            {productGrid(products.filter((product) => product.id !== detailProduct.id && product.category === detailProduct.category).slice(0, 4))}
          </section>
        )}
        </>
      ) : shopOnly ? (
        <main className="shop-page">
          <div className="shop-heading">
            <span className="eyebrow">Find your atmosphere</span>
            <h1>A scent for <em>everywhere.</em></h1>
            <p>Thoughtful fragrance for the little moments that make a place feel like yours.</p>
          </div>
          <div className="shop-tools">
            <div className="category-row" aria-label="Filter products by category">
              {[{ name: "All", slug: "all" }, ...categories].map((item) => (
                <button key={item.slug} type="button" className={category === item.name ? "active" : ""} onClick={() => setCategory(item.name)}>
                  {item.name}
                </button>
              ))}
            </div>
            <label className="shop-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search fragrances" /><span>{visibleProducts.length} fragrances</span></label>
          </div>
          <div id="collection-results">
            {visibleProducts.length ? productGrid(visibleProducts) : <p className="empty-results">No fragrances found. Try another search.</p>}
          </div>
        </main>
      ) : contactOnly ? (
        <main className="contact-page">
          <section className="contact-intro">
            <span className="eyebrow">We’re here to help</span>
            <h1>Let’s <em>talk.</em></h1>
            <p>Questions about an order, a fragrance, or anything else? Send us a note and we’ll be happy to help.</p>
            <div className="contact-details">
              <a href={`mailto:${settings.contactEmail}`}>
                <span className="eyebrow">Company email</span>
                <strong>{settings.contactEmail}</strong>
              </a>
              <a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}>
                <span className="eyebrow">Phone</span>
                <strong>{settings.contactPhone}</strong>
              </a>
            </div>
          </section>
          <ContactForm contactEmail={settings.contactEmail} />
        </main>
      ) : (
        <main>
          <section className="hero">
            <Image
              src="/merryland-hero-warm.png"
              alt="Merryland Classic Cologne fragrance with warm wood and deep wine-colored glass"
              fill
              priority
              sizes="100vw"
              className="hero-image"
            />
            <div className="hero-shade" />
            <div className="hero-copy">
              <span className="eyebrow hero-eyebrow"><Sparkles size={14} /> A feeling, bottled</span>
              <h1>Make room<br />for <em>feeling.</em></h1>
              <p>Fragrance for the little moments that make a place feel like yours.</p>
              <a className="button-light" href="#shop">Find your feeling <ArrowRight size={16} /></a>
            </div>
            <div className="hero-caption"><span>01 / 04</span><span>THE HOME COLLECTION</span></div>
            <a className="hero-scroll" href="#shop"><ArrowDown size={14} /> SCROLL TO DISCOVER</a>
          </section>

          <section className="brand-story-section" id="story">
            <div className="brand-story-heading">
              <span className="eyebrow">Our story · About us</span>
              <h2>Fragrance should feel as beautiful as it <em>smells.</em></h2>
            </div>
            <div className="brand-story-copy">
              <p>Aromas by Merryland began with one simple belief: fragrance should not only smell good, but also feel premium, ethical and long-lasting. We create thoughtful aromas for cars, homes and everyday spaces, bringing purity and elegance to the moments that make a place feel like yours.</p>
              <p>Our fragrances are made in India with care, using IFRA-compliant fragrance oils and cruelty-free values. Each one is designed with intention—whether it is calming lavender, romantic rose or warm sandalwood—so every scent tells a story, sets a mood and makes your space feel refined.</p>
              <a className="text-link" href="#why-us">What matters to us <ArrowUpRight size={14} /></a>
            </div>
          </section>

          <section className="collection-section" id="shop">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Find your atmosphere</span>
                <h2>A scent for <em>everywhere.</em></h2>
              </div>
              <Link href="/shop" className="text-link">Explore all fragrances <ArrowRight size={15} /></Link>
            </div>
            <div className="category-row" aria-label="Filter products by category">
              {[{ name: "All", slug: "all" }, ...categories].map((item) => (
                <button key={item.slug} type="button" className={category === item.name ? "active" : ""} onClick={() => setCategory(item.name)}>
                  {item.name}
                </button>
              ))}
            </div>
            {visibleProducts.length ? productGrid(visibleProducts.slice(0, 4)) : <p className="empty-results">No fragrances found. Try another search.</p>}
            <Link href="/shop" className="center-link">Discover the collection <ArrowRight size={15} /></Link>
          </section>

          <section className="ritual-section" id="ritual">
            <div className="ritual-image">
              <Image
                src="/merryland-lavender-diffuser.png"
                alt="Merryland reed diffuser among blooming lavender at sunset"
                fill
                sizes="(max-width: 760px) 100vw, 50vw"
              />
              <span className="image-index">A LITTLE SPACE TO BREATHE · NO. 01</span>
            </div>
            <div className="ritual-copy">
              <span className="eyebrow">Made for your moments</span>
              <h2>Return to<br /><em>yourself.</em></h2>
              <p>Between the busy and the beautiful, there are small moments that belong only to you. Let scent be the gentle reminder to find them.</p>
              <Link className="text-link" href="/shop">Find your ritual <ArrowRight size={15} /></Link>
              <div className="ritual-mark">M.</div>
            </div>
          </section>

          <section className="why-us-section" id="why-us">
            <div className="why-us-heading">
              <span className="eyebrow">The Merryland difference</span>
              <h2>Why choose <em>us?</em></h2>
              <p>We bring together thoughtful craftsmanship, carefully chosen materials and a love of fragrance.</p>
            </div>
            <div className="why-us-grid">
              <article><span>01</span><h3>Made in India</h3><p>Thoughtfully crafted close to home, with care at every step.</p></article>
              <article><span>02</span><h3>Cruelty-free</h3><p>We love animals; our products are not tested on animals.</p></article>
              <article><span>03</span><h3>Premium ingredients</h3><p>Carefully selected materials and fragrance oils for a considered scent experience.</p></article>
              <article><span>04</span><h3>IFRA-compliant fragrances</h3><p>Our fragrances are created to meet relevant IFRA standards.</p></article>
              <article><span>05</span><h3>Long-lasting freshness</h3><p>Designed to bring lasting freshness to the spaces you live in.</p></article>
              <article><span>06</span><h3>Everyday luxury</h3><p>Premium fragrance experiences, beautifully crafted at an everyday price.</p></article>
            </div>
          </section>

          <section className="quality-section" aria-labelledby="quality-heading">
            <div className="quality-heading">
              <span className="eyebrow">Quality, with care</span>
              <h2 id="quality-heading">The quality of <em>our aromas.</em></h2>
            </div>
            <div className="quality-grid">
              <div><strong>Natural ingredients</strong><p>Thoughtfully selected ingredients.</p></div>
              <div><strong>0% alcohol</strong><p>Alcohol-free fragrance formulations.</p></div>
              <div><strong>Premium fragrance oils</strong><p>Chosen for a beautiful, considered scent.</p></div>
              <div><strong>Made with care</strong><p>Use each product as directed on its label.</p></div>
              <div><strong>Bamboo-free</strong><p>Made without bamboo.</p></div>
              <div><strong>Charcoal-free</strong><p>Made without charcoal.</p></div>
            </div>
          </section>
          <section className="newsletter">
            <span className="eyebrow">A note now and then</span><h2>Good things, <em>in good time.</em></h2>
            <p>New rituals, thoughtful stories and the occasional lovely surprise.</p>
            <Link className="text-link" href="/contact">Get in touch <ArrowRight size={15} /></Link>
            <small>We’d love to hear from you.</small>
          </section>
        </main>
      )}

      <footer className="site-footer">
        <div className="footer-top">
          <div className="footer-brand"><Link href="/" className="wordmark"><span className="wordmark-main">AROMAS</span><span className="wordmark-sub">BY MERRYLAND</span></Link><p>Fragrance for the feeling<br />of being right where you belong.</p></div>
          <div><span className="footer-label">Explore</span><Link href="/shop">Shop all</Link><Link href="/#why-us">Why Merryland</Link><Link href="/#story">Our story</Link></div>
          <div><span className="footer-label">Here to help</span><Link href="/support">Help desk</Link><Link href="/contact">Contact us</Link><a href={`mailto:${settings.contactEmail}`}>Email us</a><a href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}>{settings.contactPhone}</a><Link href="/account">Your account</Link><Link href="/#shop">Shipping & returns</Link></div>
          <div className="footer-signoff"><span>Made with feeling, in India.</span><span className="footer-flower">✳</span></div>
        </div>
        <div className="footer-bottom"><span>© 2026 Aromas by Merryland</span><div><Link href="/#privacy">Privacy</Link><Link href="/#terms">Terms</Link></div><span>Find your feeling.</span></div>
      </footer>

      {cartOpen && <div className="drawer-scrim" onClick={() => setCartOpen(false)} aria-hidden="true" />}
      <aside className={`cart-drawer${cartOpen ? " is-open" : ""}`} aria-label="Shopping bag" aria-modal={cartOpen} role="dialog">
        <div className="drawer-head"><div><span className="eyebrow">A little something</span><h2>Your bag <span>({cartCount})</span></h2></div><button className="icon-button" onClick={() => setCartOpen(false)} type="button" aria-label="Close bag"><X size={20} /></button></div>
        {notice && <p className="drawer-notice"><Check size={14} />{notice}<button onClick={() => setNotice("")} type="button" aria-label="Dismiss notice"><X size={13} /></button></p>}
        {cartProducts.length ? (
          <>
            <div className="drawer-items">
              {cartProducts.map(({ item, product }) => (
                <div className="drawer-item" key={product.id}>
                  <div className="drawer-item-image" style={{ backgroundColor: product.colorPrimary }}><Image src={product.image} alt="" fill sizes="90px" unoptimized={!product.image.startsWith("/")} /></div>
                  <div className="drawer-item-copy"><span>{product.category}</span><strong>{product.name}</strong><small>{product.size}</small><div className="quantity-controls"><button type="button" onClick={() => changeQuantity(product.id, -1)} aria-label={`Reduce ${product.name} quantity`}><Minus size={13} /></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(product.id, 1)} aria-label={`Increase ${product.name} quantity`}><Plus size={13} /></button></div></div>
                  <strong className="drawer-item-price">{formatPrice(product.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
            <div className="drawer-total"><span>Subtotal</span><strong>{formatPrice(cartTotal)}</strong></div>
            <p className="drawer-shipping">Shipping is calculated at checkout.</p>
            <Link href="/checkout" className="button-dark drawer-checkout" onClick={() => setCartOpen(false)}>Continue to checkout <ArrowRight size={15} /></Link>
            <button type="button" className="continue-shopping" onClick={() => setCartOpen(false)}><ArrowLeft size={14} /> Continue exploring</button>
          </>
        ) : (
          <div className="empty-bag"><ShoppingBag size={26} strokeWidth={1.2} /><p>Your bag is waiting for a little something.</p><button className="button-dark" type="button" onClick={() => setCartOpen(false)}>Explore fragrances <ArrowRight size={15} /></button></div>
        )}
      </aside>
      {notice && !cartOpen && <div className="toast-message"><Check size={15} />{notice}<button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={13} /></button></div>}
      <div className="floating-back-top"><a href="#" aria-label="Back to top"><ArrowUpRight size={16} /></a></div>
    </div>
  );
}

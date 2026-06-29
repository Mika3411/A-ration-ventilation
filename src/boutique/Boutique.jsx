import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, ShoppingCart } from "lucide-react";

import { getProductPath } from "../data/products.js";
import { PageHero } from "../layout/PageHero.jsx";
import { RouteLink } from "../layout/Layout.jsx";

export function FeaturedGallery({ cartItems, currentPath, onAddToCart, onNavigate, products }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.featured);
    return (featured.length ? featured : products).slice(0, 3);
  }, [products]);
  const activeProduct = featuredProducts[activeIndex];
  const activeQuantity = activeProduct ? cartItems[activeProduct.slug] || 0 : 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [featuredProducts.length]);

  useEffect(() => {
    if (featuredProducts.length < 2) return undefined;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return undefined;

    const interval = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % featuredProducts.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [featuredProducts.length]);

  function showPrevious() {
    setActiveIndex((index) => (index - 1 + featuredProducts.length) % featuredProducts.length);
  }

  function showNext() {
    setActiveIndex((index) => (index + 1) % featuredProducts.length);
  }

  if (!activeProduct) return null;

  return (
    <section className="section featured-section" aria-labelledby="featured-title">
      <div className="container featured-layout">
        <div className="featured-copy">
          <h2 id="featured-title">Produits mis en avant</h2>
          <p>
            Une mini galerie pour faire défiler les produits clés dès l'accueil et orienter plus
            vite le visiteur vers les équipements les plus demandés.
          </p>
          <div className="featured-controls" aria-label="Contrôles de la galerie">
            <button type="button" onClick={showPrevious} aria-label="Produit précédent">
              <ChevronLeft size={22} />
            </button>
            <button type="button" onClick={showNext} aria-label="Produit suivant">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
        <div className="featured-gallery" aria-live="polite">
          <article className="featured-product">
            <div className="featured-product-media">
              <img src={activeProduct.image} alt={activeProduct.name} />
            </div>
            <div className="featured-product-copy">
              <span>{activeProduct.category}</span>
              <h3>{activeProduct.name}</h3>
              <p>{activeProduct.text}</p>
              <div className="featured-product-actions">
                <p>
                  À partir de <strong>{activeProduct.price}</strong>
                </p>
                {activeQuantity > 0 && (
                  <span className="product-quantity">{activeQuantity} dans le panier</span>
                )}
              </div>
              <div className="featured-action-row">
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => onAddToCart(activeProduct.slug)}
                >
                  <ShoppingCart size={18} />
                  Ajouter au panier
                </button>
                <RouteLink
                  className="button button-dark"
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  path="/boutique"
                >
                  Voir la boutique
                  <ArrowRight size={18} />
                </RouteLink>
              </div>
            </div>
          </article>
          <div className="featured-thumbnails" aria-label="Choisir un produit mis en avant">
            {featuredProducts.map((product, index) => (
              <button
                className={index === activeIndex ? "is-selected" : ""}
                type="button"
                key={product.name}
                onClick={() => setActiveIndex(index)}
                aria-current={index === activeIndex ? "true" : undefined}
              >
                <img src={product.image} alt="" />
                <span>{product.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductCard({ currentPath, onNavigate, product }) {
  return (
    <RouteLink
      className="product-card"
      ariaLabel={`${product.name}, ${product.price}`}
      currentPath={currentPath}
      onNavigate={onNavigate}
      path={getProductPath(product)}
    >
      <div className="product-media">
        <img src={product.image} alt={product.name} loading="lazy" />
      </div>
      <div className="product-summary">
        <h3>{product.name}</h3>
        <p className="product-card-price" aria-label={`Prix ${product.price}`}>
          {product.price}
        </p>
      </div>
    </RouteLink>
  );
}

export function ProductPreview({ currentPath, onNavigate, products }) {
  return (
    <section className="section catalog-section">
      <div className="container">
        <div className="section-heading">
          <h2>Nos produits et catégories</h2>
          <p>Un aperçu des familles les plus demandées avant d'entrer dans la boutique complète.</p>
        </div>
        <div className="product-grid product-grid-preview">
          {products.slice(0, 4).map((product) => (
            <ProductCard
              currentPath={currentPath}
              onNavigate={onNavigate}
              product={product}
              key={product.name}
            />
          ))}
        </div>
        <div className="center-action">
          <RouteLink
            className="button button-dark"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/boutique"
          >
            Voir toute la boutique
            <ArrowRight size={18} />
          </RouteLink>
        </div>
      </div>
    </section>
  );
}

export function Catalog({ categories: productCategories, currentPath, onNavigate, products }) {
  const [activeCategory, setActiveCategory] = useState("Toutes");
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = activeCategory === "Toutes" || product.category === activeCategory;
      const matchesQuery =
        !normalized ||
        `${product.name} ${product.category} ${product.text} ${product.price}`
          .toLowerCase()
          .includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, products, query]);

  return (
    <section className="section catalog-section">
      <div className="container">
        <div className="catalog-head">
          <div>
            <h2>Nos produits et catégories</h2>
            <p>Une sélection claire pour accéder vite aux familles les plus demandées.</p>
          </div>
          <label className="search-field">
            <Search size={20} />
            <span className="sr-only">Rechercher une catégorie</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher..."
            />
          </label>
        </div>
        <div className="catalog-layout">
          <aside className="category-list" aria-label="Catégories">
            <h3>Nos catégories</h3>
            <ul>
              {["Toutes", ...productCategories].map((category) => (
                <li key={category}>
                  <button
                    className={activeCategory === category ? "is-selected" : ""}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                  >
                    <ChevronRight size={16} />
                    {category}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                currentPath={currentPath}
                onNavigate={onNavigate}
                product={product}
                key={product.name}
              />
            ))}
            {!filteredProducts.length && (
              <div className="empty-state">Aucun produit ne correspond à cette recherche.</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductDetailPage({ cartItems, currentPath, onAddToCart, onNavigate, product }) {
  const quantity = cartItems[product.slug] || 0;

  return (
    <section className="section product-detail-section">
      <div className="container product-detail-layout">
        <div className="product-detail-media">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="product-detail-copy">
          <RouteLink
            className="product-back-link"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/boutique"
          >
            <ChevronLeft size={18} />
            Retour à la boutique
          </RouteLink>
          <span className="product-detail-category">{product.category}</span>
          <h1>{product.name}</h1>
          <p className="product-detail-description">{product.text}</p>
          <p className="product-detail-price" aria-label={`À partir de ${product.price}`}>
            <span>À partir de&nbsp;</span>
            <strong>{product.price}</strong>
          </p>
          <div className="product-detail-actions">
            <button
              className="button button-primary product-detail-cart-button"
              type="button"
              onClick={() => onAddToCart(product.slug)}
            >
              <ShoppingCart size={18} />
              Ajouter au panier
            </button>
            {quantity > 0 && (
              <span className="product-quantity">
                {quantity} dans le panier
              </span>
            )}
          </div>
          <div className="product-detail-meta" aria-label="Informations produit">
            <span>Livraison 3 à 4 semaines</span>
            <span>France, Belgique et Suisse</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BoutiquePage({ categories: productCategories, currentPath, onNavigate, products }) {
  return (
    <>
      <PageHero
        title="Boutique"
        text="Retrouvez les principales familles de ventilateurs, accessoires, grilles et régulateurs pour préparer votre demande."
      />
      <Catalog
        categories={productCategories}
        currentPath={currentPath}
        onNavigate={onNavigate}
        products={products}
      />
    </>
  );
}

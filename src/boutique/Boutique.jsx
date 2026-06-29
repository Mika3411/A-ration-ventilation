import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, ShoppingCart } from "lucide-react";

import { getCategoryPath, slugifyCategory } from "../data/categories.js";
import { getProductPath } from "../data/products.js";
import { RouteLink } from "../layout/Layout.jsx";
import { getProductCartQuantity } from "../panier/cart.js";

const catalogProductsPerPage = 8;

export function FeaturedGallery({ cartItems, currentPath, onAddToCart, onNavigate, products }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.featured);
    return (featured.length ? featured : products).slice(0, 3);
  }, [products]);
  const activeProduct = featuredProducts[activeIndex];
  const activeQuantity = getProductCartQuantity(activeProduct, cartItems);
  const activeProductHasOptions = Boolean(activeProduct?.options?.length);

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
                {activeProductHasOptions ? (
                  <RouteLink
                    className="button button-primary"
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    path={getProductPath(activeProduct)}
                  >
                    Choisir une option
                    <ArrowRight size={18} />
                  </RouteLink>
                ) : (
                  <button
                    className="button button-primary"
                    type="button"
                    onClick={() => onAddToCart(activeProduct.slug)}
                  >
                    <ShoppingCart size={18} />
                    Ajouter au panier
                  </button>
                )}
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
  const optionCount = product.options?.length || 0;
  const priceLabel = optionCount ? `Dès ${product.price}` : product.price;

  return (
    <RouteLink
      className="product-card"
      ariaLabel={`${product.name}, ${priceLabel}`}
      currentPath={currentPath}
      onNavigate={onNavigate}
      path={getProductPath(product)}
    >
      <div className="product-media">
        <img src={product.image} alt={product.name} loading="lazy" />
      </div>
      <div className="product-summary">
        <h3>{product.name}</h3>
        <p className="product-card-price" aria-label={`Prix ${priceLabel}`}>
          {priceLabel}
        </p>
        {optionCount > 0 && (
          <p className="product-card-options">
            {optionCount} modèle{optionCount > 1 ? "s" : ""}
          </p>
        )}
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

export function Catalog({
  categories: productCategories,
  currentPath,
  onNavigate,
  products,
  selectedCategory = "",
}) {
  const activeCategory = selectedCategory && productCategories.includes(selectedCategory)
    ? selectedCategory
    : "Toutes";
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery] = useState("");

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const activeCategorySlug = slugifyCategory(activeCategory);

    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "Toutes" ||
        slugifyCategory(product.category) === activeCategorySlug ||
        slugifyCategory(product.name) === activeCategorySlug;
      const matchesQuery =
        !normalized ||
        `${product.name} ${product.category} ${product.text} ${product.price} ${getProductOptionSearchText(product)}`
          .toLowerCase()
          .includes(normalized);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, products, query]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / catalogProductsPerPage));
  const visiblePage = Math.min(currentPage, totalPages);
  const firstProductIndex = (visiblePage - 1) * catalogProductsPerPage;
  const lastProductIndex = Math.min(
    firstProductIndex + catalogProductsPerPage,
    filteredProducts.length,
  );
  const visibleProducts = filteredProducts.slice(firstProductIndex, lastProductIndex);
  const productCountLabel = `${filteredProducts.length} produit${
    filteredProducts.length > 1 ? "s" : ""
  }`;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, query]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  function showPreviousPage() {
    setCurrentPage((page) => Math.max(page - 1, 1));
  }

  function showNextPage() {
    setCurrentPage((page) => Math.min(page + 1, totalPages));
  }

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
                  <RouteLink
                    className={activeCategory === category ? "is-selected" : ""}
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    path={category === "Toutes" ? "/boutique" : getCategoryPath(category)}
                  >
                    <ChevronRight size={16} />
                    {category}
                  </RouteLink>
                </li>
              ))}
            </ul>
          </aside>
          <div className="catalog-results">
            <p className="catalog-result-summary" aria-live="polite">
              {filteredProducts.length
                ? `${firstProductIndex + 1}-${lastProductIndex} sur ${productCountLabel}`
                : productCountLabel}
            </p>
            <div className="product-grid">
              {visibleProducts.map((product) => (
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
            {totalPages > 1 && (
              <nav className="catalog-pagination" aria-label="Pagination des produits">
                <button
                  className="button button-dark"
                  type="button"
                  onClick={showPreviousPage}
                  disabled={visiblePage === 1}
                >
                  <ChevronLeft size={18} />
                  Précédent
                </button>
                <span aria-label={`Page ${visiblePage} sur ${totalPages}`}>
                  Page {visiblePage} sur {totalPages}
                </span>
                <button
                  className="button button-dark"
                  type="button"
                  onClick={showNextPage}
                  disabled={visiblePage === totalPages}
                >
                  Suivant
                  <ChevronRight size={18} />
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductDetailPage({ cartItems, currentPath, onAddToCart, onNavigate, product }) {
  const productOptions = Array.isArray(product.options) ? product.options : [];
  const hasOptions = productOptions.length > 0;
  const [selectedOptionSlug, setSelectedOptionSlug] = useState(
    productOptions[0]?.slug || product.slug,
  );
  const selectedOption = hasOptions
    ? productOptions.find((option) => option.slug === selectedOptionSlug) || productOptions[0]
    : null;
  const selectedCartSlug = selectedOption?.slug || product.slug;
  const displayedPrice = selectedOption?.price || product.price;
  const quantity = cartItems[selectedCartSlug] || 0;

  useEffect(() => {
    setSelectedOptionSlug(productOptions[0]?.slug || product.slug);
  }, [product.slug, productOptions.length]);

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
          {hasOptions && (
            <label className="product-option-field">
              <span>Modèle</span>
              <select
                value={selectedCartSlug}
                onChange={(event) => setSelectedOptionSlug(event.target.value)}
              >
                {productOptions.map((option) => (
                  <option value={option.slug} key={option.slug}>
                    {option.label} - {option.price}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p
            className="product-detail-price"
            aria-label={hasOptions ? `Prix du modèle ${displayedPrice}` : `À partir de ${displayedPrice}`}
          >
            <span>{hasOptions ? "Prix du modèle" : "À partir de"}</span>
            <strong>{displayedPrice}</strong>
          </p>
          {selectedOption?.bgn && (
            <p className="product-option-note">Prix catalogue : {selectedOption.bgn}</p>
          )}
          <div className="product-detail-actions">
            <button
              className="button button-primary product-detail-cart-button"
              type="button"
              onClick={() => onAddToCart(selectedCartSlug)}
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

function getProductOptionSearchText(product) {
  if (!Array.isArray(product.options)) return "";

  return product.options
    .map((option) => `${option.label} ${option.price} ${option.bgn}`)
    .join(" ");
}

export function BoutiquePage({
  categories: productCategories,
  currentPath,
  onNavigate,
  products,
  selectedCategory = "",
}) {
  return (
    <Catalog
      categories={productCategories}
      currentPath={currentPath}
      onNavigate={onNavigate}
      products={products}
      selectedCategory={selectedCategory}
    />
  );
}

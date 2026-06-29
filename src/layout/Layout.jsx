import { useEffect, useState } from "react";
import { ArrowRight, ChevronUp, Menu, ShoppingCart, X } from "lucide-react";

import { brandLogoSources } from "../assets/optimizedImages.js";
import { getCategoryPath } from "../data/categories.js";
import { categories, legalRoutes, routes } from "../data/site.js";
import { normalizePath } from "../router/useRouter.js";

export function Logo({ onNavigate }) {
  return (
    <a
      className="logo"
      href="/"
      onClick={(event) => onNavigate(event, "/")}
      aria-label="Accueil Aération Ventilation"
    >
      <picture>
        <source srcSet={brandLogoSources.avif} type="image/avif" />
        <source srcSet={brandLogoSources.webp} type="image/webp" />
        <img className="logo-image" src={brandLogoSources.fallback} alt="Aération Ventilation" />
      </picture>
    </a>
  );
}

export function RouteLink({
  activeOnCategory = false,
  ariaLabel,
  children,
  className,
  currentPath,
  onNavigate,
  path,
}) {
  const targetPath = path.startsWith("/") ? path : `/${path}`;
  const activePath = normalizePath(targetPath.split("#")[0]);
  const isActive =
    currentPath === activePath ||
    (activePath === "/boutique" &&
      (currentPath.startsWith("/boutique/") ||
        (activeOnCategory && currentPath.startsWith("/categories/"))));

  return (
    <a
      className={[className, isActive ? "is-active" : ""].filter(Boolean).join(" ")}
      href={targetPath}
      onClick={(event) => onNavigate(event, targetPath)}
      aria-current={isActive ? "page" : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}

export function Header({ cartCount, currentPath, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cartLabel = `${cartCount} article${cartCount > 1 ? "s" : ""}`;

  function closeAndNavigate(event, path) {
    setMenuOpen(false);
    onNavigate(event, path);
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo onNavigate={onNavigate} />
        <nav className="desktop-nav" aria-label="Navigation principale">
          {routes.map((route) => (
            <RouteLink
              activeOnCategory={route.path === "/boutique"}
              currentPath={currentPath}
              key={route.path}
              onNavigate={onNavigate}
              path={route.path}
            >
              {route.label}
            </RouteLink>
          ))}
        </nav>
        <div className="header-actions">
          <div className="cart-indicator" aria-label={`Panier : ${cartLabel}`}>
            <ShoppingCart size={18} />
            <span>Panier</span>
            <strong>{cartCount}</strong>
          </div>
          <RouteLink
            className="button button-primary"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/contact#devis"
          >
            Demander un devis
            <ArrowRight size={18} />
          </RouteLink>
        </div>
        <button
          className="icon-button menu-toggle"
          type="button"
          aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      {menuOpen && (
        <nav className="mobile-nav" aria-label="Navigation mobile">
          {routes.map((route) => (
            <RouteLink
              activeOnCategory={route.path === "/boutique"}
              currentPath={currentPath}
              key={route.path}
              onNavigate={(event, path) => closeAndNavigate(event, path)}
              path={route.path}
            >
              {route.label}
            </RouteLink>
          ))}
          <div className="mobile-cart-indicator" aria-label={`Panier : ${cartLabel}`}>
            <ShoppingCart size={18} />
            <span>Panier</span>
            <strong>{cartCount}</strong>
          </div>
          <RouteLink
            className="button button-primary"
            currentPath={currentPath}
            onNavigate={(event, path) => closeAndNavigate(event, path)}
            path="/contact#devis"
          >
            Demander un devis
            <ArrowRight size={18} />
          </RouteLink>
        </nav>
      )}
    </header>
  );
}

export function Footer({ currentPath, onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Logo onNavigate={onNavigate} />
          <p>Ventilateurs industriels et systèmes de ventilation</p>
          <div className="social-row" aria-label="Réseaux sociaux">
            <a href="/contact" onClick={(event) => onNavigate(event, "/contact")} aria-label="LinkedIn">in</a>
            <a href="/contact" onClick={(event) => onNavigate(event, "/contact")} aria-label="Facebook">f</a>
            <a href="/contact" onClick={(event) => onNavigate(event, "/contact")} aria-label="YouTube">▶</a>
            <a href="/contact" onClick={(event) => onNavigate(event, "/contact")} aria-label="Instagram">◎</a>
          </div>
        </div>
        <div>
          <h2>Menu</h2>
          <ul>
            {routes.map((route) => (
              <li key={route.path}>
                <RouteLink
                  activeOnCategory={route.path === "/boutique"}
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  path={route.path}
                >
                  {route.label}
                </RouteLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Catégories</h2>
          <ul>
            {categories.map((category) => (
              <li key={category}>
                <RouteLink
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  path={getCategoryPath(category)}
                >
                  {category}
                </RouteLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Mon compte</h2>
          <ul>
            <li>
              <RouteLink currentPath={currentPath} onNavigate={onNavigate} path="/espace-client">
                Mon compte
              </RouteLink>
            </li>
            <li>
              <RouteLink currentPath={currentPath} onNavigate={onNavigate} path="/espace-client">
                Mes commandes
              </RouteLink>
            </li>
            <li>
              <RouteLink currentPath={currentPath} onNavigate={onNavigate} path="/espace-client">
                Connexion
              </RouteLink>
            </li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Aération Ventilation. Tous droits réservés.</span>
        <nav className="footer-legal-links" aria-label="Informations légales">
          {legalRoutes.map((route) => (
            <RouteLink
              currentPath={currentPath}
              key={route.path}
              onNavigate={onNavigate}
              path={route.path}
            >
              {route.label}
            </RouteLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setVisible(window.scrollY > 520);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <button
      className={`back-to-top ${visible ? "is-visible" : ""}`}
      type="button"
      aria-label="Retour en haut"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ChevronUp size={24} />
    </button>
  );
}

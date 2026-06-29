import { AdminPage } from "../admin/Admin.jsx";
import { BoutiquePage, ProductDetailPage } from "../boutique/Boutique.jsx";
import { ContactPage } from "../contact/Contact.jsx";
import { getProductFromPath } from "../data/products.js";
import { CustomerPortalPage } from "../espace-client/EspaceClient.jsx";
import {
  AboutPage,
  DeliveryPage,
  HomePage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from "../pages/ContentPages.jsx";

export function RouteView({
  cartItems,
  categories: productCategories,
  currentPath,
  onAddToCart,
  onNavigate,
  onProductsChanged,
  products,
  productsLoaded,
}) {
  const currentProduct = getProductFromPath(currentPath, products);

  if (currentProduct) {
    return (
      <ProductDetailPage
        cartItems={cartItems}
        currentPath={currentPath}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        product={currentProduct}
      />
    );
  }

  if (currentPath === "/boutique") {
    return (
      <BoutiquePage
        categories={productCategories}
        currentPath={currentPath}
        onNavigate={onNavigate}
        products={products}
      />
    );
  }

  if (currentPath.startsWith("/boutique/")) {
    if (!productsLoaded) {
      return (
        <BoutiquePage
          categories={productCategories}
          currentPath="/boutique"
          onNavigate={onNavigate}
          products={products}
        />
      );
    }

    return <NotFoundPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/a-propos") {
    return <AboutPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/livraison") {
    return <DeliveryPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/contact") {
    return <ContactPage />;
  }

  if (currentPath === "/confidentialite") {
    return <PrivacyPage />;
  }

  if (currentPath === "/conditions-generales-de-vente") {
    return <TermsPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/espace-client") {
    return <CustomerPortalPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/admin") {
    return <AdminPage onProductsChanged={onProductsChanged} />;
  }

  if (currentPath === "/") {
    return (
      <HomePage
        cartItems={cartItems}
        currentPath={currentPath}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        products={products}
      />
    );
  }

  return <NotFoundPage currentPath={currentPath} onNavigate={onNavigate} />;
}

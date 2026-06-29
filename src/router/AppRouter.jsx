import { AdminPage } from "../admin/Admin.jsx";
import { BoutiquePage, ProductDetailPage } from "../boutique/Boutique.jsx";
import { ContactPage } from "../contact/Contact.jsx";
import { getProductFromPath } from "../data/products.js";
import { CustomerPortalPage } from "../espace-client/EspaceClient.jsx";
import { AboutPage, DeliveryPage, HomePage } from "../pages/ContentPages.jsx";

export function RouteView({
  cartItems,
  categories: productCategories,
  currentPath,
  onAddToCart,
  onNavigate,
  onProductsChanged,
  products,
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
    return (
      <BoutiquePage
        categories={productCategories}
        currentPath="/boutique"
        onNavigate={onNavigate}
        products={products}
      />
    );
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

  if (currentPath === "/espace-client") {
    return <CustomerPortalPage currentPath={currentPath} onNavigate={onNavigate} />;
  }

  if (currentPath === "/admin") {
    return <AdminPage onProductsChanged={onProductsChanged} />;
  }

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

import { useEffect, useState } from "react";
import { LogIn, LogOut, PackagePlus, Save, Trash2 } from "lucide-react";

import { defaultProducts, getProductCategories, normalizeProducts, productImageOptions } from "../data/products.js";
import { PageHero } from "../layout/PageHero.jsx";

const emptyAdminProductForm = {
  name: "",
  category: "Ventilation industrielle",
  amount: "",
  description: "",
  imageKey: "ductFan",
  imageUrl: "",
  featured: false,
  active: true,
  sortOrder: "0",
};

function getAdminProductForm(product) {
  if (!product) return emptyAdminProductForm;

  return {
    name: product.name,
    category: product.category,
    amount: String(product.amount / 100),
    description: product.description || product.text,
    imageKey: product.imageKey || "ductFan",
    imageUrl: product.imageUrl || "",
    featured: product.featured === true,
    active: product.active !== false,
    sortOrder: String(product.sortOrder || 0),
  };
}

function getAdminProductPayload(form) {
  const amount = Number.parseFloat(String(form.amount).replace(",", "."));

  return {
    name: form.name,
    category: form.category,
    amount: Number.isFinite(amount) ? Math.round(amount * 100) : -1,
    description: form.description,
    imageKey: form.imageKey,
    imageUrl: form.imageUrl,
    featured: form.featured,
    active: form.active,
    sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
  };
}

export function AdminPage({ onProductsChanged }) {
  const [admin, setAdmin] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authMessage, setAuthMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });

  useEffect(() => {
    let alive = true;

    async function loadAdminSession() {
      try {
        const response = await fetch("/api/admin/me");
        const payload = await response.json().catch(() => ({}));

        if (!alive) return;

        setAdmin(payload.admin || null);
        setAuthMessage(payload.error || "");
        setAuthStatus(payload.admin ? "authenticated" : "anonymous");
      } catch {
        if (!alive) return;
        setAuthMessage("Impossible de vérifier la session admin.");
        setAuthStatus("anonymous");
      }
    }

    loadAdminSession();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginForm),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Connexion impossible.");
      }

      setAdmin(payload.admin);
      setLoginForm((form) => ({ ...form, password: "" }));
      setAuthStatus("authenticated");
    } catch (error) {
      setAdmin(null);
      setAuthStatus("anonymous");
      setAuthMessage(error instanceof Error ? error.message : "Connexion impossible.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(null);
    setAuthStatus("anonymous");
  }

  return (
    <>
      <PageHero
        title="Administration boutique"
        text="Gérez les produits, les prix, les visuels et les catégories affichés dans la boutique."
      />
      <section className="section admin-section">
        <div className="container">
          {authStatus === "checking" && (
            <div className="admin-empty-state">Vérification de la session admin...</div>
          )}
          {authStatus !== "checking" && !admin && (
            <form className="admin-login-panel" onSubmit={handleLogin}>
              <div>
                <LogIn size={34} />
                <h2>Connexion admin</h2>
              </div>
              <label>
                Identifiant
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((form) => ({ ...form, username: event.target.value }))
                  }
                  autoComplete="username"
                />
              </label>
              <label>
                Mot de passe
                <input
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((form) => ({ ...form, password: event.target.value }))
                  }
                  type="password"
                  autoComplete="current-password"
                />
              </label>
              <button className="button button-primary" type="submit" disabled={authStatus === "loading"}>
                <LogIn size={18} />
                {authStatus === "loading" ? "Connexion..." : "Se connecter"}
              </button>
              {authMessage && (
                <p className="form-error" role="alert">
                  {authMessage}
                </p>
              )}
            </form>
          )}
          {admin && (
            <AdminProductsManager
              admin={admin}
              onLogout={handleLogout}
              onProductsChanged={onProductsChanged}
            />
          )}
        </div>
      </section>
    </>
  );
}

function AdminProductsManager({ admin, onLogout, onProductsChanged }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyAdminProductForm);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const selectedProduct = products.find((product) => product.slug === selectedSlug);
  const adminCategories = getProductCategories(products.length ? products : defaultProducts);
  const isSaving = status === "saving";

  useEffect(() => {
    loadAdminProducts();
  }, []);

  async function loadAdminProducts(nextSelectedSlug = selectedSlug) {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/products");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les produits.");
      }

      const loadedProducts = normalizeProducts(payload.products);
      const nextProduct =
        loadedProducts.find((product) => product.slug === nextSelectedSlug) || loadedProducts[0];

      setProducts(loadedProducts);
      setSelectedSlug(nextProduct?.slug || "");
      setForm(getAdminProductForm(nextProduct));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Impossible de charger les produits.");
    }
  }

  function selectProduct(product) {
    setSelectedSlug(product.slug);
    setForm(getAdminProductForm(product));
    setMessage("");
  }

  function createNewProduct() {
    setSelectedSlug("");
    setForm({
      ...emptyAdminProductForm,
      sortOrder: String((products.length + 1) * 10),
    });
    setMessage("");
  }

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveProduct(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(
        selectedSlug ? `/api/admin/products/${selectedSlug}` : "/api/admin/products",
        {
          method: selectedSlug ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(getAdminProductPayload(form)),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'enregistrer le produit.");
      }

      setStatus("ready");
      await loadAdminProducts(payload.product?.slug);
      setMessage("Produit enregistré.");
      await onProductsChanged();
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer le produit.");
    }
  }

  async function deleteSelectedProduct() {
    if (!selectedProduct) return;

    const confirmed = window.confirm(`Supprimer ${selectedProduct.name} de la boutique ?`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/products/${selectedProduct.slug}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de supprimer le produit.");
      }

      setStatus("ready");
      await loadAdminProducts("");
      setMessage("Produit supprimé.");
      await onProductsChanged();
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer le produit.");
    }
  }

  return (
    <div className="admin-layout">
      <div className="admin-toolbar">
        <div>
          <span>Connecté</span>
          <strong>{admin.username}</strong>
        </div>
        <button className="button button-dark" type="button" onClick={onLogout}>
          <LogOut size={18} />
          Déconnexion
        </button>
      </div>
      <aside className="admin-product-list" aria-label="Produits administrables">
        <div className="admin-product-list-head">
          <h2>Produits</h2>
          <button type="button" onClick={createNewProduct} aria-label="Ajouter un produit">
            <PackagePlus size={20} />
          </button>
        </div>
        {status === "loading" && <p className="admin-empty-state">Chargement des produits...</p>}
        {status !== "loading" &&
          products.map((product) => (
            <button
              className={selectedSlug === product.slug ? "is-selected" : ""}
              type="button"
              key={product.slug}
              onClick={() => selectProduct(product)}
            >
              <img src={product.image} alt="" />
              <span>
                <strong>{product.name}</strong>
                <small>{product.category}</small>
              </span>
              <em>{product.active ? "Actif" : "Masqué"}</em>
            </button>
          ))}
      </aside>
      <form className="admin-product-form" onSubmit={saveProduct}>
        <div className="admin-form-head">
          <div>
            <span>{selectedSlug ? selectedSlug : "nouveau-produit"}</span>
            <h2>{selectedSlug ? "Modifier le produit" : "Ajouter un produit"}</h2>
          </div>
          <div className="admin-form-actions">
            {selectedSlug && (
              <button
                className="admin-delete-button"
                type="button"
                onClick={deleteSelectedProduct}
                disabled={isSaving}
              >
                <Trash2 size={18} />
                Supprimer
              </button>
            )}
            <button className="button button-primary" type="submit" disabled={isSaving}>
              <Save size={18} />
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
        <div className="admin-form-grid">
          <label>
            Nom
            <input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              required
            />
          </label>
          <label>
            Catégorie
            <input
              value={form.category}
              list="admin-category-list"
              onChange={(event) => updateForm("category", event.target.value)}
              required
            />
            <datalist id="admin-category-list">
              {adminCategories.map((category) => (
                <option value={category} key={category} />
              ))}
            </datalist>
          </label>
          <label>
            Prix EUR
            <input
              value={form.amount}
              onChange={(event) => updateForm("amount", event.target.value)}
              inputMode="decimal"
              required
            />
          </label>
          <label>
            Ordre
            <input
              value={form.sortOrder}
              onChange={(event) => updateForm("sortOrder", event.target.value)}
              inputMode="numeric"
            />
          </label>
          <label>
            Image interne
            <select
              value={form.imageKey}
              onChange={(event) => updateForm("imageKey", event.target.value)}
            >
              {productImageOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            URL image
            <input
              value={form.imageUrl}
              onChange={(event) => updateForm("imageUrl", event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="admin-wide-field">
            Description
            <textarea
              value={form.description}
              onChange={(event) => updateForm("description", event.target.value)}
            />
          </label>
          <div className="admin-toggle-row">
            <label>
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => updateForm("featured", event.target.checked)}
              />
              Mis en avant
            </label>
            <label>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) => updateForm("active", event.target.checked)}
              />
              Visible en boutique
            </label>
          </div>
        </div>
        {message && (
          <p className={message.includes("Impossible") || message.includes("obligatoire") ? "form-error" : "form-success"}>
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

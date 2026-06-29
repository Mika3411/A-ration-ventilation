import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  Check,
  Edit3,
  LogIn,
  LogOut,
  Mail,
  PackagePlus,
  Phone,
  Plus,
  Save,
  Search,
  ShoppingBag,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { normalizeCategories, normalizeProducts, productImageOptions } from "../data/products.js";
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

const emptyAdminMemberForm = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  email: "",
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
});

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

function getAdminMemberForm(member) {
  if (!member) return emptyAdminMemberForm;

  return {
    firstName: member.firstName || "",
    lastName: member.lastName || "",
    company: member.company || "",
    phone: member.phone || "",
    email: member.email || "",
  };
}

function getAdminMemberPayload(form) {
  return {
    firstName: form.firstName,
    lastName: form.lastName,
    company: form.company,
    phone: form.phone,
    email: form.email,
  };
}

function formatAdminDate(value) {
  if (!value) return "Non renseigné";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";

  return dateFormatter.format(date);
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
        text="Gérez les produits, les catégories, les membres et les informations client de la boutique."
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
  const [activeView, setActiveView] = useState("products");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyAdminProductForm);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const selectedProduct = products.find((product) => product.slug === selectedSlug);
  const adminCategories = normalizeCategories(categories, products);
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
      const loadedCategories = normalizeCategories(payload.categories, loadedProducts);
      const nextProduct =
        loadedProducts.find((product) => product.slug === nextSelectedSlug) || loadedProducts[0];

      setProducts(loadedProducts);
      setCategories(loadedCategories);
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

  async function mutateCategory(endpoint, options, fallbackMessage) {
    const response = await fetch(endpoint, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.error || fallbackMessage);
    }

    await loadAdminProducts(selectedSlug);
    await onProductsChanged();
    return payload;
  }

  async function createCategory(name) {
    return mutateCategory(
      "/api/admin/categories",
      {
        method: "POST",
        body: JSON.stringify({ name }),
      },
      "Impossible de créer la catégorie.",
    );
  }

  async function renameCategory(currentName, name) {
    return mutateCategory(
      "/api/admin/categories",
      {
        method: "PUT",
        body: JSON.stringify({ currentName, name }),
      },
      "Impossible de renommer la catégorie.",
    );
  }

  async function deleteCategory(name) {
    return mutateCategory(
      "/api/admin/categories",
      {
        method: "DELETE",
        body: JSON.stringify({ name }),
      },
      "Impossible de supprimer la catégorie.",
    );
  }

  return (
    <div className="admin-layout">
      <div className="admin-toolbar">
        <div>
          <span>Connecté</span>
          <strong>{admin.username}</strong>
        </div>
        <div className="admin-toolbar-actions">
          <div className="admin-view-tabs" aria-label="Sections d'administration">
            <button
              className={activeView === "products" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("products")}
            >
              <PackagePlus size={18} />
              Produits
            </button>
            <button
              className={activeView === "members" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("members")}
            >
              <Users size={18} />
              Membres
            </button>
          </div>
          <button className="button button-dark" type="button" onClick={onLogout}>
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </div>
      {activeView === "products" ? (
        <>
          <div className="admin-sidebar">
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
            <AdminCategoriesManager
              categories={adminCategories}
              onCreateCategory={createCategory}
              onDeleteCategory={deleteCategory}
              onRenameCategory={renameCategory}
              products={products}
            />
          </div>
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
              <p
                className={
                  message.includes("Impossible") || message.includes("obligatoire")
                    ? "form-error"
                    : "form-success"
                }
              >
                {message}
              </p>
            )}
          </form>
        </>
      ) : (
        <AdminMembersManager />
      )}
    </div>
  );
}

function AdminMembersManager() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyAdminMemberForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [detailStatus, setDetailStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const selectedMember =
    memberDetail || members.find((member) => member.id === selectedMemberId) || null;
  const isSaving = detailStatus === "saving";

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;

    return members.filter((member) =>
      [
        member.fullName,
        member.email,
        member.company,
        member.phone,
        member.totalSpentLabel,
        String(member.orderCount),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [members, query]);

  useEffect(() => {
    let alive = true;

    async function loadMembers() {
      setStatus("loading");
      setMessage("");

      try {
        const response = await fetch("/api/admin/members");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de charger les membres.");
        }

        if (!alive) return;

        const loadedMembers = Array.isArray(payload.members) ? payload.members : [];
        setMembers(loadedMembers);
        setSelectedMemberId((currentId) => currentId || loadedMembers[0]?.id || "");
        setStatus("ready");
      } catch (error) {
        if (!alive) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Impossible de charger les membres.");
      }
    }

    loadMembers();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMemberId) {
      setMemberDetail(null);
      setMemberForm(emptyAdminMemberForm);
      return undefined;
    }

    let alive = true;

    async function loadMemberDetail() {
      setDetailStatus("loading");
      setMessage("");

      try {
        const response = await fetch(`/api/admin/members/${selectedMemberId}`);
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de charger le membre.");
        }

        if (!alive) return;

        setMemberDetail(payload.member);
        setMemberForm(getAdminMemberForm(payload.member));
        setDetailStatus("idle");
      } catch (error) {
        if (!alive) return;
        setMemberDetail(null);
        setDetailStatus("error");
        setMessage(error instanceof Error ? error.message : "Impossible de charger le membre.");
      }
    }

    loadMemberDetail();
    return () => {
      alive = false;
    };
  }, [selectedMemberId]);

  function selectMember(member) {
    setSelectedMemberId(member.id);
    setMessage("");
  }

  function updateMemberForm(field, value) {
    setMemberForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveMember(event) {
    event.preventDefault();
    if (!selectedMemberId) return;

    setDetailStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/members/${selectedMemberId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(getAdminMemberPayload(memberForm)),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de modifier le membre.");
      }

      setMemberDetail(payload.member);
      setMemberForm(getAdminMemberForm(payload.member));
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === payload.member.id
            ? {
                ...member,
                ...payload.member,
                orders: undefined,
              }
            : member,
        ),
      );
      setDetailStatus("idle");
      setMessage("Membre enregistré.");
    } catch (error) {
      setDetailStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de modifier le membre.");
    }
  }

  return (
    <section className="admin-members-panel" aria-label="Gestion des membres">
      <div className="admin-members-head">
        <div>
          <span>Clients</span>
          <h2>Membres</h2>
        </div>
        <label className="admin-member-search">
          <Search size={18} />
          <span className="sr-only">Rechercher un membre</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un membre..."
          />
        </label>
      </div>

      {message && (
        <p
          className={
            message.includes("Impossible") ||
            message.includes("obligatoire") ||
            message.includes("valide") ||
            message.includes("existe déjà")
              ? "form-error"
              : "form-success"
          }
        >
          {message}
        </p>
      )}

      <div className="admin-members-shell">
        <aside className="admin-member-list" aria-label="Membres enregistrés">
          {status === "loading" && <p className="admin-empty-state">Chargement des membres...</p>}
          {status === "error" && !members.length && (
            <p className="admin-empty-state">
              Impossible de charger les membres. Vérifiez que la base Render Postgres est configurée.
            </p>
          )}
          {status !== "loading" && status !== "error" && !members.length && (
            <p className="admin-empty-state">Aucun membre inscrit pour le moment.</p>
          )}
          {status !== "loading" &&
            filteredMembers.map((member) => (
              <button
                className={selectedMemberId === member.id ? "is-selected" : ""}
                type="button"
                key={member.id}
                onClick={() => selectMember(member)}
              >
                <span className="admin-member-avatar" aria-hidden="true">
                  {(member.firstName || member.email || "?").charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{member.fullName || member.email}</strong>
                  <small>{member.email}</small>
                </span>
                <em>
                  {member.orderCount} commande{member.orderCount > 1 ? "s" : ""}
                </em>
              </button>
            ))}
          {status !== "loading" && members.length > 0 && filteredMembers.length === 0 && (
            <p className="admin-empty-state">Aucun membre ne correspond à cette recherche.</p>
          )}
        </aside>

        <div className="admin-member-detail">
          {!selectedMember && detailStatus !== "loading" && (
            <p className="admin-empty-state">Sélectionnez un membre pour voir ses informations.</p>
          )}
          {detailStatus === "loading" && (
            <p className="admin-empty-state">Chargement des informations du membre...</p>
          )}
          {selectedMember && detailStatus !== "loading" && (
            <>
              <div className="admin-member-summary">
                <span className="admin-member-avatar admin-member-avatar-large" aria-hidden="true">
                  {(selectedMember.firstName || selectedMember.email || "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <span>Membre</span>
                  <h2>{selectedMember.fullName || selectedMember.email}</h2>
                  <p>{selectedMember.email}</p>
                </div>
              </div>

              <div className="admin-member-stats">
                <article>
                  <ShoppingBag size={22} />
                  <span>Commandes</span>
                  <strong>{selectedMember.orderCount}</strong>
                </article>
                <article>
                  <UserRound size={22} />
                  <span>Total dépensé</span>
                  <strong>{selectedMember.totalSpentLabel}</strong>
                </article>
                <article>
                  <CalendarClock size={22} />
                  <span>Dernière commande</span>
                  <strong>{formatAdminDate(selectedMember.lastOrderAt)}</strong>
                </article>
                <article>
                  <CalendarClock size={22} />
                  <span>Inscription</span>
                  <strong>{formatAdminDate(selectedMember.createdAt)}</strong>
                </article>
              </div>

              <form className="admin-member-form" onSubmit={saveMember}>
                <div className="admin-form-head">
                  <div>
                    <span>{selectedMember.id}</span>
                    <h2>Informations membre</h2>
                  </div>
                  <button className="button button-primary" type="submit" disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>
                    Prénom
                    <input
                      value={memberForm.firstName}
                      onChange={(event) => updateMemberForm("firstName", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      value={memberForm.lastName}
                      onChange={(event) => updateMemberForm("lastName", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <span className="admin-input-with-icon">
                      <Mail size={18} />
                      <input
                        value={memberForm.email}
                        onChange={(event) => updateMemberForm("email", event.target.value)}
                        type="email"
                        required
                      />
                    </span>
                  </label>
                  <label>
                    Téléphone
                    <span className="admin-input-with-icon">
                      <Phone size={18} />
                      <input
                        value={memberForm.phone}
                        onChange={(event) => updateMemberForm("phone", event.target.value)}
                      />
                    </span>
                  </label>
                  <label className="admin-wide-field">
                    Entreprise
                    <span className="admin-input-with-icon">
                      <Building2 size={18} />
                      <input
                        value={memberForm.company}
                        onChange={(event) => updateMemberForm("company", event.target.value)}
                      />
                    </span>
                  </label>
                </div>
              </form>

              <section className="admin-member-orders" aria-label="Commandes du membre">
                <div className="admin-category-head">
                  <div>
                    <span>Historique</span>
                    <h2>Commandes</h2>
                  </div>
                </div>
                {Array.isArray(memberDetail?.orders) && memberDetail.orders.length > 0 ? (
                  <ul>
                    {memberDetail.orders.map((order) => (
                      <li key={order.id}>
                        <div>
                          <strong>{order.total}</strong>
                          <span>{formatAdminDate(order.createdAt)}</span>
                        </div>
                        <div>
                          <span>{order.status || "Statut inconnu"}</span>
                          <small>
                            {order.items.length} article{order.items.length > 1 ? "s" : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-empty-state">Aucune commande enregistrée pour ce membre.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function AdminCategoriesManager({
  categories,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategory,
  products,
}) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingName, setEditingName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const isSaving = status === "saving";
  const productCounts = products.reduce((counts, product) => {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
    return counts;
  }, new Map());

  async function handleCreateCategory(event) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setStatus("saving");
    setMessage("");

    try {
      await onCreateCategory(name);
      setNewCategoryName("");
      setStatus("idle");
      setMessage("Catégorie ajoutée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de créer la catégorie.");
    }
  }

  function startEditingCategory(category) {
    setEditingCategory(category);
    setEditingName(category);
    setMessage("");
  }

  function cancelEditingCategory() {
    setEditingCategory("");
    setEditingName("");
  }

  async function handleRenameCategory(event) {
    event.preventDefault();
    const name = editingName.trim();
    if (!editingCategory || !name) return;

    setStatus("saving");
    setMessage("");

    try {
      await onRenameCategory(editingCategory, name);
      setEditingCategory("");
      setEditingName("");
      setStatus("idle");
      setMessage("Catégorie renommée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de renommer la catégorie.");
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(`Supprimer la catégorie ${category} ?`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    try {
      await onDeleteCategory(category);
      setStatus("idle");
      setMessage("Catégorie supprimée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer la catégorie.");
    }
  }

  return (
    <section className="admin-category-manager" aria-label="Catégories administrables">
      <div className="admin-category-head">
        <div>
          <span>Boutique</span>
          <h2>Catégories</h2>
        </div>
      </div>
      <form className="admin-category-form" onSubmit={handleCreateCategory}>
        <label>
          Nouvelle catégorie
          <span>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nom de catégorie"
              disabled={isSaving}
            />
            <button type="submit" aria-label="Ajouter la catégorie" disabled={isSaving}>
              <Plus size={18} />
            </button>
          </span>
        </label>
      </form>
      <ul className="admin-category-list">
        {categories.map((category) => {
          const productCount = productCounts.get(category) || 0;
          const isEditing = editingCategory === category;

          return (
            <li key={category}>
              {isEditing ? (
                <form className="admin-category-edit" onSubmit={handleRenameCategory}>
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    disabled={isSaving}
                    autoFocus
                  />
                  <button type="submit" aria-label="Valider le renommage" disabled={isSaving}>
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Annuler le renommage"
                    onClick={cancelEditingCategory}
                    disabled={isSaving}
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <span>
                    <strong>{category}</strong>
                    <small>
                      {productCount} produit{productCount > 1 ? "s" : ""}
                    </small>
                  </span>
                  <div className="admin-category-actions">
                    <button
                      type="button"
                      onClick={() => startEditingCategory(category)}
                      aria-label={`Renommer ${category}`}
                      disabled={isSaving}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      aria-label={`Supprimer ${category}`}
                      disabled={isSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {message && (
        <p className={isCategoryErrorMessage(message) ? "form-error" : "form-success"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function isCategoryErrorMessage(message) {
  return (
    message.includes("Impossible") ||
    message.includes("obligatoire") ||
    message.includes("existe déjà") ||
    message.includes("introuvable")
  );
}

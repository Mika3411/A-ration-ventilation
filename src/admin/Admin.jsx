import { useEffect, useId, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Archive,
  BadgePercent,
  Building2,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Edit3,
  ImagePlus,
  ListFilter,
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

import { normalizeCategories, normalizeProducts } from "../data/products.js";
import { PageHero } from "../layout/PageHero.jsx";

const adminProductsPerPage = 6;
const adminProductSortOptions = [
  { value: "manual", label: "Ordre manuel" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "created-desc", label: "Date d'ajout récente" },
  { value: "created-asc", label: "Date d'ajout ancienne" },
  { value: "updated-desc", label: "Dernière modification" },
  { value: "name-asc", label: "Nom A-Z" },
  { value: "category-asc", label: "Catégorie A-Z" },
];
const adminProductCollator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
const maxAdminImageFileSize = 1 * 1024 * 1024;
const adminProductStatusFilters = [
  { value: "active", label: "Actifs" },
  { value: "archived", label: "Archivé" },
];

const emptyAdminProductForm = {
  name: "",
  category: "Ventilation industrielle",
  amount: "",
  description: "",
  options: [],
  quantityDiscounts: [],
  imageKey: "ductFan",
  imageUrl: "",
  imageData: "",
  imagePreview: "",
  imageFileName: "",
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

const emptyAdminPromoCodeForm = {
  code: "",
  percent: "",
  minimumAmount: "",
  startsAt: "",
  endsAt: "",
  active: true,
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
    options: getAdminProductOptionForm(product.options),
    quantityDiscounts: getAdminQuantityDiscountForm(product.quantityDiscounts),
    imageKey: product.imageKey || "ductFan",
    imageUrl: product.imageUrl || "",
    imageData: product.imageData || "",
    imagePreview: product.image || product.imageData || product.imageUrl || "",
    imageFileName: "",
    featured: product.featured === true,
    active: product.active !== false,
    sortOrder: String(product.sortOrder || 0),
  };
}

function getAdminQuantityDiscountForm(discounts) {
  if (!Array.isArray(discounts)) return [];

  return discounts.map((discount) => ({
    minQuantity: String(discount.minQuantity || ""),
    percent: String(discount.percent || "").replace(".", ","),
  }));
}

function getAdminProductOptionForm(options) {
  if (!Array.isArray(options)) return [];

  return options.map((option) => ({
    label: option.label || "",
    amount: Number.isInteger(option.amount) ? String(option.amount / 100) : "",
    bgn: option.bgn || "",
    description: option.description || "",
    slug: option.slug || "",
    value: option.value || "",
  }));
}

function createEmptyQuantityDiscountForm() {
  return {
    minQuantity: "",
    percent: "",
  };
}

function createEmptyProductOptionForm() {
  return {
    label: "",
    amount: "",
    bgn: "",
    description: "",
    slug: "",
    value: "",
  };
}

function parseEuroAmountToCents(value) {
  const amount = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(amount) ? Math.round(amount * 100) : -1;
}

function parseDiscountPercent(value) {
  const percent = Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(percent) ? Math.round(percent * 100) / 100 : -1;
}

function getAdminProductPayload(form) {
  return {
    name: form.name,
    category: form.category,
    amount: parseEuroAmountToCents(form.amount),
    description: form.description,
    options: form.options.map((option) => ({
      label: option.label,
      amount: parseEuroAmountToCents(option.amount),
      bgn: option.bgn,
      description: option.description,
      slug: option.slug,
      value: option.value,
    })),
    quantityDiscounts: form.quantityDiscounts
      .filter((discount) => String(discount.minQuantity || "").trim() || String(discount.percent || "").trim())
      .map((discount) => ({
        minQuantity: Number.parseInt(discount.minQuantity, 10),
        percent: parseDiscountPercent(discount.percent),
      })),
    imageKey: form.imageKey,
    imageUrl: form.imageUrl,
    imageData: form.imageData,
    featured: form.featured,
    active: form.active,
    sortOrder: Number.parseInt(form.sortOrder, 10) || 0,
  };
}

function getAdminPromoCodeForm(promoCode) {
  if (!promoCode) return emptyAdminPromoCodeForm;

  return {
    code: promoCode.code || "",
    percent: String(promoCode.percent || "").replace(".", ","),
    minimumAmount: promoCode.minimumAmount ? String(promoCode.minimumAmount / 100).replace(".", ",") : "",
    startsAt: formatAdminDateTimeInput(promoCode.startsAt),
    endsAt: formatAdminDateTimeInput(promoCode.endsAt),
    active: promoCode.active !== false,
  };
}

function getAdminPromoCodePayload(form) {
  return {
    code: form.code,
    percent: parseDiscountPercent(form.percent),
    minimumAmount: form.minimumAmount ? parseEuroAmountToCents(form.minimumAmount) : 0,
    startsAt: form.startsAt,
    endsAt: form.endsAt,
    active: form.active,
  };
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("Impossible de lire l'image.")));
    reader.readAsDataURL(file);
  });
}

function normalizeAdminSearchValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isAdminProductInStatusFilter(product, statusFilter) {
  return statusFilter === "archived" ? product.active === false : product.active !== false;
}

function getAdminProductTimestamp(product, field) {
  const timestamp = new Date(product?.[field]).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function compareAdminProductManualOrder(first, second) {
  return (
    (Number.parseInt(first.sortOrder, 10) || 0) - (Number.parseInt(second.sortOrder, 10) || 0) ||
    adminProductCollator.compare(first.name || "", second.name || "")
  );
}

function sortAdminProducts(products, sortMode) {
  return [...products].sort((first, second) => {
    switch (sortMode) {
      case "price-asc":
        return first.amount - second.amount || compareAdminProductManualOrder(first, second);
      case "price-desc":
        return second.amount - first.amount || compareAdminProductManualOrder(first, second);
      case "created-desc":
        return (
          getAdminProductTimestamp(second, "createdAt") -
            getAdminProductTimestamp(first, "createdAt") ||
          compareAdminProductManualOrder(first, second)
        );
      case "created-asc":
        return (
          getAdminProductTimestamp(first, "createdAt") -
            getAdminProductTimestamp(second, "createdAt") ||
          compareAdminProductManualOrder(first, second)
        );
      case "updated-desc":
        return (
          getAdminProductTimestamp(second, "updatedAt") -
            getAdminProductTimestamp(first, "updatedAt") ||
          compareAdminProductManualOrder(first, second)
        );
      case "name-asc":
        return adminProductCollator.compare(first.name || "", second.name || "");
      case "category-asc":
        return (
          adminProductCollator.compare(first.category || "", second.category || "") ||
          compareAdminProductManualOrder(first, second)
        );
      default:
        return compareAdminProductManualOrder(first, second);
    }
  });
}

function AdminHelpTooltip({ text }) {
  const tooltipId = useId();

  return (
    <span className="admin-help-tooltip">
      <span
        className="admin-help-trigger"
        tabIndex={0}
        aria-describedby={tooltipId}
        aria-label="Aide"
      >
        <CircleHelp size={15} aria-hidden="true" />
      </span>
      <span className="admin-help-bubble" id={tooltipId} role="tooltip">
        {text}
      </span>
    </span>
  );
}

function AdminFieldLabel({ label, help }) {
  return (
    <span className="admin-field-label">
      <span>{label}</span>
      <AdminHelpTooltip text={help} />
    </span>
  );
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

function formatAdminDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatAdminPercent(value) {
  const percent = Number.parseFloat(String(value).replace(",", "."));
  if (!Number.isFinite(percent)) return "";
  return Number.isInteger(percent) ? `${percent}%` : `${String(percent).replace(".", ",")}%`;
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
  const [productPage, setProductPage] = useState(1);
  const [productQuery, setProductQuery] = useState("");
  const [productSort, setProductSort] = useState("manual");
  const [productStatusFilter, setProductStatusFilter] = useState("active");
  const [selectedProductCategories, setSelectedProductCategories] = useState([]);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(false);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const selectedProduct = products.find((product) => product.slug === selectedSlug);
  const adminCategories = useMemo(() => normalizeCategories(categories, products), [categories, products]);
  const isSaving = status === "saving";
  const selectedProductCategorySet = useMemo(
    () => new Set(selectedProductCategories),
    [selectedProductCategories],
  );
  const activeCategoryFilterCount = selectedProductCategories.length;
  const activeProductsCount = useMemo(
    () => products.filter((product) => product.active !== false).length,
    [products],
  );
  const archivedProductsCount = products.length - activeProductsCount;
  const statusScopedProducts = useMemo(
    () =>
      products.filter((product) =>
        isAdminProductInStatusFilter(product, productStatusFilter),
      ),
    [productStatusFilter, products],
  );
  const productCategoryCounts = useMemo(
    () =>
      statusScopedProducts.reduce((counts, product) => {
        counts.set(product.category, (counts.get(product.category) || 0) + 1);
        return counts;
      }, new Map()),
    [statusScopedProducts],
  );
  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeAdminSearchValue(productQuery.trim());
    const categoryFilteredProducts =
      selectedProductCategorySet.size === 0
        ? statusScopedProducts
        : statusScopedProducts.filter((product) => selectedProductCategorySet.has(product.category));

    if (!normalizedQuery) {
      return categoryFilteredProducts;
    }

    return categoryFilteredProducts.filter((product) => {
      const optionSearchText = Array.isArray(product.options)
        ? product.options
            .map((option) => `${option.label} ${option.price} ${option.bgn} ${option.description}`)
            .join(" ")
        : "";
      const searchableProduct = normalizeAdminSearchValue(
        [
          product.name,
          product.category,
          product.description,
          product.text,
          product.price,
          product.slug,
          optionSearchText,
          product.active ? "actif visible" : "archive archivé masque masqué",
        ]
          .filter(Boolean)
          .join(" "),
      );

      return searchableProduct.includes(normalizedQuery);
    });
  }, [productQuery, selectedProductCategorySet, statusScopedProducts]);
  const sortedProducts = useMemo(
    () => sortAdminProducts(filteredProducts, productSort),
    [filteredProducts, productSort],
  );
  const productPageCount = Math.max(1, Math.ceil(sortedProducts.length / adminProductsPerPage));
  const currentProductPage = Math.min(productPage, productPageCount);
  const productPageStart = (currentProductPage - 1) * adminProductsPerPage;
  const paginatedProducts = useMemo(
    () => sortedProducts.slice(productPageStart, productPageStart + adminProductsPerPage),
    [sortedProducts, productPageStart],
  );
  const productPageFirstItem = sortedProducts.length === 0 ? 0 : productPageStart + 1;
  const productPageLastItem = productPageStart + paginatedProducts.length;
  const shouldPaginateProducts = sortedProducts.length > adminProductsPerPage;

  useEffect(() => {
    loadAdminProducts();
  }, []);

  useEffect(() => {
    setProductPage((currentPage) => Math.min(currentPage, productPageCount));
  }, [productPageCount]);

  useEffect(() => {
    setSelectedProductCategories((currentCategories) =>
      currentCategories.filter((category) => adminCategories.includes(category)),
    );
  }, [adminCategories]);

  async function loadAdminProducts(nextSelectedSlug = selectedSlug, nextStatusFilter = productStatusFilter) {
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
      const statusVisibleProducts = loadedProducts.filter((product) =>
        isAdminProductInStatusFilter(product, nextStatusFilter),
      );
      const nextProduct =
        statusVisibleProducts.find((product) => product.slug === nextSelectedSlug) ||
        statusVisibleProducts[0] ||
        null;

      setProducts(loadedProducts);
      setCategories(loadedCategories);
      setSelectedSlug(nextProduct?.slug || "");
      setForm(
        nextProduct
          ? getAdminProductForm(nextProduct)
          : {
              ...emptyAdminProductForm,
              sortOrder: String((loadedProducts.length + 1) * 10),
            },
      );
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
    setProductQuery("");
    setProductStatusFilter("active");
    setSelectedProductCategories([]);
    setIsCategoryFilterOpen(false);
    setProductPage(1);
    setForm({
      ...emptyAdminProductForm,
      sortOrder: String((products.length + 1) * 10),
    });
    setMessage("");
  }

  function updateProductQuery(value) {
    setProductQuery(value);
    setProductPage(1);
  }

  function updateProductStatusFilter(value) {
    if (value === productStatusFilter) return;

    const nextProduct = products.find((product) => isAdminProductInStatusFilter(product, value));

    setProductStatusFilter(value);
    setSelectedSlug(nextProduct?.slug || "");
    setForm(
      nextProduct
        ? getAdminProductForm(nextProduct)
        : {
            ...emptyAdminProductForm,
            sortOrder: String((products.length + 1) * 10),
          },
    );
    setProductPage(1);
    setIsCategoryFilterOpen(false);
    setMessage("");
  }

  function updateProductSort(value) {
    setProductSort(value);
    setProductPage(1);
  }

  function toggleProductCategoryFilter(category) {
    setSelectedProductCategories((currentCategories) =>
      currentCategories.includes(category)
        ? currentCategories.filter((currentCategory) => currentCategory !== category)
        : [...currentCategories, category],
    );
    setProductPage(1);
  }

  function clearProductCategoryFilters() {
    setSelectedProductCategories([]);
    setProductPage(1);
  }

  function goToProductPage(nextPage) {
    setProductPage(Math.min(Math.max(nextPage, 1), productPageCount));
  }

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function addProductOption() {
    setForm((currentForm) => ({
      ...currentForm,
      options: [...currentForm.options, createEmptyProductOptionForm()],
    }));
  }

  function updateProductOption(index, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      options: currentForm.options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [field]: value } : option,
      ),
    }));
  }

  function removeProductOption(index) {
    setForm((currentForm) => ({
      ...currentForm,
      options: currentForm.options.filter((_, optionIndex) => optionIndex !== index),
    }));
  }

  function addQuantityDiscount() {
    setForm((currentForm) => ({
      ...currentForm,
      quantityDiscounts: [
        ...currentForm.quantityDiscounts,
        createEmptyQuantityDiscountForm(),
      ],
    }));
  }

  function updateQuantityDiscount(index, field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      quantityDiscounts: currentForm.quantityDiscounts.map((discount, discountIndex) =>
        discountIndex === index ? { ...discount, [field]: value } : discount,
      ),
    }));
  }

  function removeQuantityDiscount(index) {
    setForm((currentForm) => ({
      ...currentForm,
      quantityDiscounts: currentForm.quantityDiscounts.filter(
        (_, discountIndex) => discountIndex !== index,
      ),
    }));
  }

  async function importProductImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Merci d'importer un fichier image.");
      return;
    }

    if (file.size > maxAdminImageFileSize) {
      setMessage("L'image ne doit pas dépasser 1 Mo.");
      return;
    }

    try {
      const imageData = await readFileAsDataUrl(file);

      if (typeof imageData !== "string") {
        throw new Error("Impossible de lire l'image.");
      }

      setForm((currentForm) => ({
        ...currentForm,
        imageData,
        imagePreview: imageData,
        imageFileName: file.name,
        imageUrl: "",
      }));
      setMessage("Image importée. Pensez à enregistrer le produit.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'importer l'image.");
    }
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

      const nextStatusFilter = payload.product?.active === false ? "archived" : "active";

      setStatus("ready");
      setProductStatusFilter(nextStatusFilter);
      await loadAdminProducts(payload.product?.slug, nextStatusFilter);
      setMessage("Produit enregistré.");
      await onProductsChanged();
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer le produit.");
    }
  }

  async function deleteSelectedProduct() {
    if (!selectedProduct) return;

    const confirmed = window.confirm(`Archiver ${selectedProduct.name} ?`);
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

      const archivedSlug = selectedProduct.slug;
      const nextStatusFilter = "archived";

      setStatus("ready");
      setProductStatusFilter(nextStatusFilter);
      await loadAdminProducts(archivedSlug, nextStatusFilter);
      setMessage("Produit archivé.");
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
            <button
              className={activeView === "promo-codes" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("promo-codes")}
            >
              <BadgePercent size={18} />
              Codes promo
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
              <label className="admin-product-search">
                <Search size={18} />
                <span className="sr-only">Rechercher un produit</span>
                <input
                  value={productQuery}
                  onChange={(event) => updateProductQuery(event.target.value)}
                  placeholder="Rechercher un produit..."
                  type="search"
                />
              </label>
              <label className="admin-product-sort">
                <ArrowUpDown size={18} />
                <span className="sr-only">Trier les produits</span>
                <select value={productSort} onChange={(event) => updateProductSort(event.target.value)}>
                  {adminProductSortOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="admin-product-status-tabs" aria-label="Filtrer par statut produit">
                {adminProductStatusFilters.map((filter) => {
                  const productCount =
                    filter.value === "archived" ? archivedProductsCount : activeProductsCount;
                  const Icon = filter.value === "archived" ? Archive : Check;

                  return (
                    <button
                      className={productStatusFilter === filter.value ? "is-active" : ""}
                      type="button"
                      key={filter.value}
                      onClick={() => updateProductStatusFilter(filter.value)}
                      aria-pressed={productStatusFilter === filter.value}
                    >
                      <Icon size={17} />
                      <span>{filter.label}</span>
                      <em>{productCount}</em>
                    </button>
                  );
                })}
              </div>
              <div className="admin-product-filter">
                <button
                  className={activeCategoryFilterCount > 0 ? "is-active" : ""}
                  type="button"
                  onClick={() => setIsCategoryFilterOpen((isOpen) => !isOpen)}
                  aria-expanded={isCategoryFilterOpen}
                  aria-haspopup="dialog"
                >
                  <ListFilter size={18} />
                  <span>Catégories</span>
                  {activeCategoryFilterCount > 0 && <em>{activeCategoryFilterCount}</em>}
                </button>
                {isCategoryFilterOpen && (
                  <div className="admin-category-filter-popover" role="dialog" aria-label="Filtrer par catégories">
                    <div className="admin-category-filter-head">
                      <div>
                        <span>Filtrer</span>
                        <strong>Catégories</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCategoryFilterOpen(false)}
                        aria-label="Fermer le filtre catégories"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="admin-category-filter-list">
                      {adminCategories.map((category) => {
                        const productCount = productCategoryCounts.get(category) || 0;

                        return (
                          <label key={category}>
                            <input
                              type="checkbox"
                              checked={selectedProductCategorySet.has(category)}
                              onChange={() => toggleProductCategoryFilter(category)}
                            />
                            <span>
                              <strong>{category}</strong>
                              <small>
                                {productCount} produit{productCount > 1 ? "s" : ""}
                              </small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="admin-category-filter-actions">
                      <button
                        type="button"
                        onClick={clearProductCategoryFilters}
                        disabled={activeCategoryFilterCount === 0}
                      >
                        Tout afficher
                      </button>
                      <button type="button" onClick={() => setIsCategoryFilterOpen(false)}>
                        Appliquer
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {status === "loading" && <p className="admin-empty-state">Chargement des produits...</p>}
              {status !== "loading" &&
                paginatedProducts.map((product) => (
                  <button
                    className={selectedSlug === product.slug ? "is-selected" : ""}
                    type="button"
                    key={product.slug}
                    onClick={() => selectProduct(product)}
                  >
                    <img src={product.image} alt="" />
                    <span>
                      <strong>{product.name}</strong>
                      <small>
                        {product.category}
                        {product.options?.length
                          ? ` · ${product.options.length} variante${product.options.length > 1 ? "s" : ""}`
                          : ""}
                      </small>
                    </span>
                    <em>{product.active ? "Actif" : "Archivé"}</em>
                  </button>
                ))}
              {status !== "loading" && products.length > 0 && statusScopedProducts.length === 0 && (
                <p className="admin-empty-state">
                  {productStatusFilter === "archived"
                    ? "Aucun produit archivé."
                    : "Aucun produit actif."}
                </p>
              )}
              {status !== "loading" &&
                statusScopedProducts.length > 0 &&
                filteredProducts.length === 0 && (
                  <p className="admin-empty-state">Aucun produit ne correspond à ces filtres.</p>
                )}
              {status !== "loading" && products.length === 0 && (
                <p className="admin-empty-state">Aucun produit enregistré pour le moment.</p>
              )}
              {status !== "loading" && shouldPaginateProducts && (
                <nav className="admin-product-pagination" aria-label="Pagination des produits">
                  <button
                    type="button"
                    onClick={() => goToProductPage(currentProductPage - 1)}
                    disabled={currentProductPage === 1}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    {productPageFirstItem}-{productPageLastItem} / {sortedProducts.length}
                    <small>
                      Page {currentProductPage} / {productPageCount}
                    </small>
                  </span>
                  <button
                    type="button"
                    onClick={() => goToProductPage(currentProductPage + 1)}
                    disabled={currentProductPage === productPageCount}
                    aria-label="Page suivante"
                  >
                    <ChevronRight size={18} />
                  </button>
                </nav>
              )}
            </aside>
          </div>
          <div className="admin-product-main">
            <form className="admin-product-form" onSubmit={saveProduct}>
              <div className="admin-form-head">
                <div>
                  <span>{selectedSlug ? selectedSlug : "nouveau-produit"}</span>
                  <h2>{selectedSlug ? "Modifier le produit" : "Ajouter un produit"}</h2>
                </div>
                <div className="admin-form-actions">
                  {selectedSlug && selectedProduct?.active !== false && (
                    <button
                      className="admin-delete-button"
                      type="button"
                      onClick={deleteSelectedProduct}
                      disabled={isSaving}
                    >
                      <Archive size={18} />
                      Archiver
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
                  <AdminFieldLabel
                    label="Nom"
                    help="Nom affiché sur la boutique, la fiche produit et dans le panier."
                  />
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    required
                  />
                </label>
                <label>
                  <AdminFieldLabel
                    label="Catégorie"
                    help="Tape une catégorie existante ou un nouveau nom pour classer le produit."
                  />
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
                  <AdminFieldLabel
                    label="Prix EUR"
                    help="Prix public en euros. Tu peux utiliser une virgule ou un point."
                  />
                  <input
                    value={form.amount}
                    onChange={(event) => updateForm("amount", event.target.value)}
                    inputMode="decimal"
                    required
                  />
                </label>
                <label>
                  <AdminFieldLabel
                    label="Ordre"
                    help="Position dans les listes. Astuce : 10, 20, 30 laisse de la place pour insérer 15 plus tard."
                  />
                  <input
                    value={form.sortOrder}
                    onChange={(event) => updateForm("sortOrder", event.target.value)}
                    inputMode="numeric"
                  />
                </label>
                <label className="admin-wide-field">
                  <AdminFieldLabel
                    label="Image produit"
                    help="Image importée pour ce produit. Elle remplace l'image actuelle après enregistrement."
                  />
                  <div className="admin-image-import">
                    <div className="admin-image-preview">
                      {form.imagePreview ? (
                        <img src={form.imagePreview} alt="" />
                      ) : (
                        <ImagePlus size={34} />
                      )}
                    </div>
                    <div className="admin-image-import-copy">
                      <strong>{form.imageFileName || "Importer une image"}</strong>
                      <span>PNG, JPG, WebP ou GIF jusqu'à 1 Mo.</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        onChange={importProductImage}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                </label>
                <label className="admin-wide-field">
                  <AdminFieldLabel
                    label="Description"
                    help="Texte affiché sur la fiche produit pour expliquer l'usage du produit."
                  />
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                  />
                </label>
                <section className="admin-variant-section admin-wide-field" aria-label="Variantes produit">
                  <div className="admin-variant-head">
                    <div>
                      <span>Variantes</span>
                      <strong>
                        {form.options.length
                          ? `${form.options.length} variante${form.options.length > 1 ? "s" : ""}`
                          : "Prix unique"}
                      </strong>
                    </div>
                    <button type="button" onClick={addProductOption} disabled={isSaving}>
                      <Plus size={18} />
                      Ajouter une variante
                    </button>
                  </div>
                  {form.options.length > 0 ? (
                    <div className="admin-variant-list">
                      {form.options.map((option, index) => (
                        <article className="admin-variant-card" key={`${option.slug || "variant"}-${index}`}>
                          <div className="admin-variant-card-head">
                            <strong>Variante {index + 1}</strong>
                            <button
                              type="button"
                              onClick={() => removeProductOption(index)}
                              disabled={isSaving}
                              aria-label={`Supprimer la variante ${index + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="admin-variant-grid">
                            <label>
                              <AdminFieldLabel
                                label="Libellé"
                                help="Nom court affiché dans le sélecteur de modèle, par exemple 200, 250-A ou 2,2 kW."
                              />
                              <input
                                value={option.label}
                                onChange={(event) =>
                                  updateProductOption(index, "label", event.target.value)
                                }
                                required
                              />
                            </label>
                            <label>
                              <AdminFieldLabel
                                label="Prix EUR"
                                help="Prix de cette variante en euros. Tu peux utiliser une virgule ou un point."
                              />
                              <input
                                value={option.amount}
                                onChange={(event) =>
                                  updateProductOption(index, "amount", event.target.value)
                                }
                                inputMode="decimal"
                                required
                              />
                            </label>
                            <label>
                              <AdminFieldLabel
                                label="Prix BGN"
                                help="Prix indicatif en leva bulgares si tu veux garder la référence fournisseur."
                              />
                              <input
                                value={option.bgn}
                                onChange={(event) =>
                                  updateProductOption(index, "bgn", event.target.value)
                                }
                              />
                            </label>
                            <label>
                              <AdminFieldLabel
                                label="Note"
                                help="Texte court optionnel propre à cette variante."
                              />
                              <input
                                value={option.description}
                                onChange={(event) =>
                                  updateProductOption(index, "description", event.target.value)
                                }
                              />
                            </label>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-variant-empty">Ce produit utilise seulement le prix principal.</p>
                  )}
                </section>
                <section
                  className="admin-variant-section admin-wide-field"
                  aria-label="Remises quantité"
                >
                  <div className="admin-variant-head">
                    <div>
                      <span>Remises quantité</span>
                      <strong>
                        {form.quantityDiscounts.length
                          ? `${form.quantityDiscounts.length} palier${
                              form.quantityDiscounts.length > 1 ? "s" : ""
                            }`
                          : "Aucune remise"}
                      </strong>
                    </div>
                    <button type="button" onClick={addQuantityDiscount} disabled={isSaving}>
                      <Plus size={18} />
                      Ajouter une remise
                    </button>
                  </div>
                  {form.quantityDiscounts.length > 0 ? (
                    <div className="admin-variant-list">
                      {form.quantityDiscounts.map((discount, index) => (
                        <article
                          className="admin-variant-card"
                          key={`quantity-discount-${index}`}
                        >
                          <div className="admin-variant-card-head">
                            <strong>Palier {index + 1}</strong>
                            <button
                              type="button"
                              onClick={() => removeQuantityDiscount(index)}
                              disabled={isSaving}
                              aria-label={`Supprimer le palier ${index + 1}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="admin-discount-grid">
                            <label>
                              <AdminFieldLabel
                                label="Quantité min."
                                help="La remise s'applique à partir de cette quantité dans le panier, par exemple 5."
                              />
                              <input
                                value={discount.minQuantity}
                                onChange={(event) =>
                                  updateQuantityDiscount(index, "minQuantity", event.target.value)
                                }
                                inputMode="numeric"
                                required
                              />
                            </label>
                            <label>
                              <AdminFieldLabel
                                label="Remise %"
                                help="Pourcentage de réduction appliqué au prix unitaire, par exemple 10 pour -10%."
                              />
                              <input
                                value={discount.percent}
                                onChange={(event) =>
                                  updateQuantityDiscount(index, "percent", event.target.value)
                                }
                                inputMode="decimal"
                                required
                              />
                            </label>
                            <p>
                              À partir de {discount.minQuantity || "..."} pièce
                              {discount.minQuantity === "1" ? "" : "s"} : -
                              {discount.percent || "..."}%
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-variant-empty">
                      Ajoute un palier pour appliquer une réduction automatique selon la quantité.
                    </p>
                  )}
                </section>
                <div className="admin-toggle-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(event) => updateForm("featured", event.target.checked)}
                    />
                    <span>Mis en avant</span>
                    <AdminHelpTooltip text="Affiche le produit dans les zones de mise en avant de la boutique." />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(event) => updateForm("active", event.target.checked)}
                    />
                    <span>Visible en boutique</span>
                    <AdminHelpTooltip text="Décoche pour envoyer le produit dans Archivé sans le perdre." />
                  </label>
                </div>
              </div>
              {message && (
                <p
                  className={
                    message.includes("Impossible") ||
                    message.includes("obligatoire") ||
                    message.includes("Merci") ||
                    message.includes("doit") ||
                    message.includes("valide")
                      ? "form-error"
                      : "form-success"
                  }
                >
                  {message}
                </p>
              )}
            </form>
            <AdminCategoriesManager
              categories={adminCategories}
              onCreateCategory={createCategory}
              onDeleteCategory={deleteCategory}
              onRenameCategory={renameCategory}
              products={products}
            />
          </div>
        </>
      ) : activeView === "members" ? (
        <AdminMembersManager />
      ) : (
        <AdminPromoCodesManager />
      )}
    </div>
  );
}

function AdminPromoCodesManager() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState(emptyAdminPromoCodeForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const selectedPromoCode =
    promoCodes.find((promoCode) => promoCode.code === selectedCode) || null;
  const isSaving = status === "saving";

  const filteredPromoCodes = useMemo(() => {
    const normalizedQuery = normalizeAdminSearchValue(query.trim());
    if (!normalizedQuery) return promoCodes;

    return promoCodes.filter((promoCode) =>
      normalizeAdminSearchValue(
        [
          promoCode.code,
          `${promoCode.percent}%`,
          promoCode.active ? "actif" : "inactif",
          promoCode.minimumAmountLabel,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery),
    );
  }, [promoCodes, query]);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  async function loadPromoCodes(nextSelectedCode = selectedCode) {
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/promo-codes");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de charger les codes promo.");
      }

      const loadedPromoCodes = Array.isArray(payload.promoCodes) ? payload.promoCodes : [];
      const nextPromoCode =
        loadedPromoCodes.find((promoCode) => promoCode.code === nextSelectedCode) ||
        loadedPromoCodes[0] ||
        null;

      setPromoCodes(loadedPromoCodes);
      setSelectedCode(nextPromoCode?.code || "");
      setForm(getAdminPromoCodeForm(nextPromoCode));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Impossible de charger les codes promo.");
    }
  }

  function selectPromoCode(promoCode) {
    setSelectedCode(promoCode.code);
    setForm(getAdminPromoCodeForm(promoCode));
    setMessage("");
  }

  function createNewPromoCode() {
    setSelectedCode("");
    setForm(emptyAdminPromoCodeForm);
    setMessage("");
  }

  function updatePromoForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function savePromoCode(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(
        selectedCode ? `/api/admin/promo-codes/${selectedCode}` : "/api/admin/promo-codes",
        {
          method: selectedCode ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(getAdminPromoCodePayload(form)),
        },
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'enregistrer le code promo.");
      }

      setStatus("ready");
      await loadPromoCodes(payload.promoCode?.code);
      setMessage("Code promo enregistré.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer le code promo.");
    }
  }

  async function deleteSelectedPromoCode() {
    if (!selectedPromoCode) return;

    const confirmed = window.confirm(`Supprimer le code promo ${selectedPromoCode.code} ?`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/promo-codes/${selectedPromoCode.code}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de supprimer le code promo.");
      }

      setStatus("ready");
      await loadPromoCodes("");
      setMessage("Code promo supprimé.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer le code promo.");
    }
  }

  return (
    <section className="admin-promo-panel" aria-label="Gestion des codes promo">
      <div className="admin-members-head admin-promo-head">
        <div>
          <span>Réductions</span>
          <h2>Codes promo</h2>
        </div>
        <label className="admin-member-search">
          <Search size={18} />
          <span className="sr-only">Rechercher un code promo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un code..."
          />
        </label>
      </div>

      {message && (
        <p
          className={
            message.includes("Impossible") ||
            message.includes("obligatoire") ||
            message.includes("valable") ||
            message.includes("invalide") ||
            message.includes("existe déjà")
              ? "form-error"
              : "form-success"
          }
        >
          {message}
        </p>
      )}

      <div className="admin-promo-shell">
        <aside className="admin-promo-list" aria-label="Codes promo enregistrés">
          <div className="admin-product-list-head">
            <h2>Codes</h2>
            <button type="button" onClick={createNewPromoCode} aria-label="Ajouter un code promo">
              <BadgePercent size={20} />
            </button>
          </div>
          {status === "loading" && <p className="admin-empty-state">Chargement des codes promo...</p>}
          {status === "error" && !promoCodes.length && (
            <p className="admin-empty-state">Impossible de charger les codes promo.</p>
          )}
          {status !== "loading" && !promoCodes.length && (
            <p className="admin-empty-state">Aucun code promo créé pour le moment.</p>
          )}
          {status !== "loading" &&
            filteredPromoCodes.map((promoCode) => (
              <button
                className={selectedCode === promoCode.code ? "is-selected" : ""}
                type="button"
                key={promoCode.code}
                onClick={() => selectPromoCode(promoCode)}
              >
                <span>
                  <strong>{promoCode.code}</strong>
                  <small>
                    -{formatAdminPercent(promoCode.percent)}
                    {promoCode.minimumAmount > 0
                      ? ` dès ${promoCode.minimumAmountLabel}`
                      : " sans minimum"}
                  </small>
                </span>
                <em>{promoCode.active ? "Actif" : "Inactif"}</em>
              </button>
            ))}
          {status !== "loading" && promoCodes.length > 0 && filteredPromoCodes.length === 0 && (
            <p className="admin-empty-state">Aucun code promo ne correspond à cette recherche.</p>
          )}
        </aside>

        <form className="admin-promo-form" onSubmit={savePromoCode}>
          <div className="admin-form-head">
            <div>
              <span>{selectedCode || "nouveau-code"}</span>
              <h2>{selectedCode ? "Modifier le code promo" : "Créer un code promo"}</h2>
            </div>
            <div className="admin-form-actions">
              {selectedPromoCode && (
                <button
                  className="button button-dark"
                  type="button"
                  onClick={deleteSelectedPromoCode}
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
              <AdminFieldLabel
                label="Code"
                help="Code saisi par le client dans le panier. Lettres, chiffres, tiret ou underscore."
              />
              <input
                value={form.code}
                onChange={(event) => updatePromoForm("code", event.target.value.toUpperCase())}
                placeholder="PRO10"
                required
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Remise %"
                help="Pourcentage appliqué au panier après les remises quantité."
              />
              <input
                value={form.percent}
                onChange={(event) => updatePromoForm("percent", event.target.value)}
                inputMode="decimal"
                placeholder="10"
                required
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Minimum EUR"
                help="Montant minimum du panier avant le code promo. Laissez vide pour aucun minimum."
              />
              <input
                value={form.minimumAmount}
                onChange={(event) => updatePromoForm("minimumAmount", event.target.value)}
                inputMode="decimal"
                placeholder="100"
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Début"
                help="Optionnel. Le code ne sera utilisable qu'à partir de cette date."
              />
              <input
                value={form.startsAt}
                onChange={(event) => updatePromoForm("startsAt", event.target.value)}
                type="datetime-local"
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Fin"
                help="Optionnel. Après cette date, le code sera refusé automatiquement."
              />
              <input
                value={form.endsAt}
                onChange={(event) => updatePromoForm("endsAt", event.target.value)}
                type="datetime-local"
              />
            </label>
            <div className="admin-toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updatePromoForm("active", event.target.checked)}
                />
                <span>Code actif</span>
                <AdminHelpTooltip text="Décoche pour garder le code en admin sans permettre son utilisation." />
              </label>
            </div>
          </div>

          <div className="admin-promo-preview">
            <BadgePercent size={22} />
            <div>
              <span>Aperçu</span>
              <strong>
                {form.code || "CODE"} -{formatAdminPercent(form.percent) || "..."}
              </strong>
              <p>
                {form.minimumAmount
                  ? `Valable à partir de ${form.minimumAmount} € de panier.`
                  : "Valable sans minimum de panier."}
              </p>
            </div>
          </div>
        </form>
      </div>
    </section>
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
          <AdminFieldLabel
            label="Nouvelle catégorie"
            help="Ajoute une catégorie qui pourra ensuite être utilisée sur les fiches produits."
          />
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

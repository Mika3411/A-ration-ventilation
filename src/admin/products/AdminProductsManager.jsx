import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Archive,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  ListFilter,
  PackagePlus,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { normalizeCategories, normalizeProducts } from "../../data/products.js";
import { AdminCategoriesManager } from "../categories/AdminCategoriesManager.jsx";
import { AdminFieldLabel, AdminHelpTooltip } from "../components/AdminFieldLabel.jsx";
import { createAdminCategory, deleteAdminCategory, renameAdminCategory } from "../categories/categoriesApi.js";
import { readFileAsDataUrl } from "../utils/files.js";
import { normalizeAdminSearchValue } from "../utils/search.js";
import { archiveAdminProduct, fetchAdminProducts, saveAdminProduct } from "./productsApi.js";
import {
  adminProductsPerPage,
  adminProductSortOptions,
  adminProductStatusFilters,
  createEmptyProductOptionForm,
  createEmptyQuantityDiscountForm,
  emptyAdminProductForm,
  getAdminProductForm,
  getAdminProductPayload,
  isAdminProductInStatusFilter,
  maxAdminImageFileSize,
  sortAdminProducts,
} from "./productForm.js";

export function AdminProductsManager({ onProductsChanged }) {
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
      const payload = await fetchAdminProducts();

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
      const payload = await saveAdminProduct(selectedSlug, getAdminProductPayload(form));

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
      await archiveAdminProduct(selectedProduct.slug);

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

  async function reloadProductsAfterCategoryChange(payload) {
    await loadAdminProducts(selectedSlug);
    await onProductsChanged();
    return payload;
  }

  async function createCategory(name) {
    const payload = await createAdminCategory(name);
    return reloadProductsAfterCategoryChange(payload);
  }

  async function renameCategory(currentName, name) {
    const payload = await renameAdminCategory(currentName, name);
    return reloadProductsAfterCategoryChange(payload);
  }

  async function deleteCategory(name) {
    const payload = await deleteAdminCategory(name);
    return reloadProductsAfterCategoryChange(payload);
  }

  return (
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
  );
}

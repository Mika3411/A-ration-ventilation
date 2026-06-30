import { parseDiscountPercent, parseEuroAmountToCents } from "../utils/format.js";

export const adminProductsPerPage = 6;
export const adminProductSortOptions = [
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
export const maxAdminImageFileSize = 1 * 1024 * 1024;
export const adminProductStatusFilters = [
  { value: "active", label: "Actifs" },
  { value: "archived", label: "Archivé" },
];

export const emptyAdminProductForm = {
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

export function getAdminProductForm(product) {
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

export function createEmptyQuantityDiscountForm() {
  return {
    minQuantity: "",
    percent: "",
  };
}

export function createEmptyProductOptionForm() {
  return {
    label: "",
    amount: "",
    bgn: "",
    description: "",
    slug: "",
    value: "",
  };
}

export function getAdminProductPayload(form) {
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

export function isAdminProductInStatusFilter(product, statusFilter) {
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

export function sortAdminProducts(products, sortMode) {
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

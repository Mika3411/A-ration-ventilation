export const categoryPathPrefix = "/categories/";

export function getCategoryPath(category) {
  return `${categoryPathPrefix}${slugifyCategory(category)}`;
}

export function getCategorySlugFromPath(pathname = "") {
  const pathOnly = String(pathname).split(/[?#]/, 1)[0].replace(/\/+$/, "");
  if (!pathOnly.startsWith(categoryPathPrefix)) return "";

  return decodeURIComponent(pathOnly.slice(categoryPathPrefix.length)).trim();
}

export function getCategoryFromPath(pathname, categories) {
  const slug = getCategorySlugFromPath(pathname);
  if (!slug) return "";

  return findCategoryBySlug(categories, slug);
}

export function findCategoryBySlug(categories, slug) {
  if (!Array.isArray(categories)) return "";

  return categories.find((category) => slugifyCategory(category) === slug) || "";
}

export function isCategoryPath(pathname = "") {
  return Boolean(getCategorySlugFromPath(pathname));
}

export function slugifyCategory(value) {
  const slug = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "categorie";
}

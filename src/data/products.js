import axialFan from "../assets/product-axial-fan.jpg";

import ductFan from "../assets/product-duct-fan.jpg";

import ceilingGrille from "../assets/product-ceiling-grille.jpg";

import speedController from "../assets/product-speed-controller.jpg";

import { categories } from "./site.js";

import { formatEuro } from "../utils/format.js";

export const productImageByKey = {
  axialFan,
  ductFan,
  ceilingGrille,
  speedController,
};

export const productImageOptions = [
  { label: "Ventilateur axial", value: "axialFan" },
  { label: "Ventilateur de canal", value: "ductFan" },
  { label: "Grille plafond", value: "ceilingGrille" },
  { label: "Régulateur", value: "speedController" },
];

export const defaultProducts = [
  {
    name: "Ventilateurs axiaux",
    slug: "ventilateurs-axiaux",
    category: "Ventilation industrielle",
    imageKey: "axialFan",
    imageUrl: "",
    amount: 24900,
    price: "249 €",
    text: "Ventilateurs haute performance pour le renouvellement d'air et l'extraction.",
    featured: true,
    active: true,
    sortOrder: 10,
  },
  {
    name: "Ventilateurs de canaux",
    slug: "ventilateurs-de-canaux",
    category: "Réseaux de conduits",
    imageKey: "ductFan",
    imageUrl: "",
    amount: 18900,
    price: "189 €",
    text: "Solutions compactes pour installations dans les conduits.",
    featured: true,
    active: true,
    sortOrder: 20,
  },
  {
    name: "Grilles de ventilation plafond",
    slug: "grilles-de-ventilation-plafond",
    category: "Diffusion d'air",
    imageKey: "ceilingGrille",
    imageUrl: "",
    amount: 7900,
    price: "79 €",
    text: "Diffusion d'air efficace pour bureaux, commerces et bâtiments industriels.",
    featured: false,
    active: true,
    sortOrder: 30,
  },
  {
    name: "Régulateurs",
    slug: "regulateurs",
    category: "Pilotage",
    imageKey: "speedController",
    imageUrl: "",
    amount: 12900,
    price: "129 €",
    text: "Régulation de vitesse et contrôle pour optimiser vos installations.",
    featured: true,
    active: true,
    sortOrder: 40,
  },
].map(normalizeProduct);

export function resolveProductImage(product) {
  return product.imageData || product.imageUrl || productImageByKey[product.imageKey] || ductFan;
}

export function normalizeProduct(product) {
  const amount = Number.parseInt(product.amount, 10);

  return {
    ...product,
    amount: Number.isInteger(amount) ? amount : 0,
    price: product.price || formatEuro(Number.isInteger(amount) ? amount : 0),
    text: product.text || product.description || "",
    description: product.description || product.text || "",
    imageKey: product.imageKey || "ductFan",
    imageUrl: product.imageUrl || "",
    imageData: product.imageData || "",
    image: resolveProductImage(product),
    featured: product.featured === true,
    active: product.active !== false,
    sortOrder: Number.parseInt(product.sortOrder, 10) || 0,
  };
}

export function normalizeProducts(productsToNormalize) {
  if (!Array.isArray(productsToNormalize)) return defaultProducts;
  return productsToNormalize.map(normalizeProduct).filter((product) => product.slug && product.name);
}

export function normalizeCategories(categoriesToNormalize, products = defaultProducts) {
  const sourceCategories = Array.isArray(categoriesToNormalize) ? categoriesToNormalize : categories;
  return Array.from(new Set([...sourceCategories, ...products.map((product) => product.category)]))
    .filter(Boolean)
    .sort((first, second) => first.localeCompare(second, "fr"));
}

export function getProductPath(product) {
  return `/boutique/${product.slug}`;
}

export function getProductFromPath(pathname, products) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (!cleanPath.startsWith("/boutique/")) return undefined;
  const slug = cleanPath.replace("/boutique/", "");
  return products.find((product) => product.slug === slug);
}

export function getProductCategories(products, categoryList = categories) {
  return normalizeCategories(categoryList, products);
}

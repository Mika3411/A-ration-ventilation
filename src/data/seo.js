export const defaultSeo = {
  title: "Aération Ventilation - Ventilateurs industriels",
  description:
    "Aération Ventilation fournit des ventilateurs industriels et systèmes de ventilation en France, Belgique et Suisse.",
};

export const notFoundSeo = {
  title: "Page introuvable - Aération Ventilation",
  description:
    "Cette page Aération Ventilation n'existe pas ou n'est plus disponible. Retrouvez la boutique, les conseils et le formulaire de contact.",
  robots: "noindex, nofollow",
};

export const pageSeo = {
  "/": defaultSeo,
  "/boutique": {
    title: "Boutique - Aération Ventilation",
    description:
      "Parcourez les ventilateurs, grilles, régulateurs et accessoires pour vos installations de ventilation professionnelles.",
  },
  "/a-propos": {
    title: "A Propos De Nous - Aération Ventilation",
    description:
      "Découvrez l'accompagnement Aération Ventilation pour choisir, installer et maintenir des systèmes de ventilation adaptés.",
  },
  "/livraison": {
    title: "Livraison - Aération Ventilation",
    description:
      "Consultez les étapes de livraison Aération Ventilation pour les équipements commandés en France, Belgique et Suisse.",
  },
  "/contact": {
    title: "Contact - Aération Ventilation",
    description:
      "Contactez Aération Ventilation pour un devis, un conseil technique ou une question sur vos équipements de ventilation.",
  },
  "/espace-client": {
    title: "Espace client - Aération Ventilation",
    description:
      "Accédez à votre espace client Aération Ventilation pour suivre vos demandes et vos commandes de ventilation.",
    robots: "noindex, nofollow",
  },
  "/confidentialite": {
    title: "Politique de confidentialité - Aération Ventilation",
    description:
      "Lisez la politique de confidentialité d'Aération Ventilation concernant les données personnelles et les demandes client.",
  },
  "/conditions-generales-de-vente": {
    title: "Conditions générales de vente - Aération Ventilation",
    description:
      "Consultez les conditions générales de vente applicables aux commandes passées auprès d'Aération Ventilation.",
  },
  "/admin": {
    title: "Administration boutique - Aération Ventilation",
    description: "Interface d'administration de la boutique Aération Ventilation.",
    robots: "noindex, nofollow",
  },
};

export const pageTitles = Object.fromEntries(
  Object.entries(pageSeo).map(([path, seo]) => [path, seo.title]),
);

export function getPageSeo(pathname, product) {
  const normalizedPath = normalizeSeoPath(pathname);

  if (product && normalizedPath.startsWith("/boutique/")) {
    return getProductSeo(product);
  }

  if (pageSeo[normalizedPath]) return pageSeo[normalizedPath];

  return notFoundSeo;
}

export function getProductSeo(product) {
  const name = cleanSeoText(product?.name, "Produit");
  const summary = cleanSeoText(product?.description || product?.text, "");
  const description = summary
    ? `${summary} Disponible chez Aération Ventilation avec conseil pour vos projets professionnels.`
    : `${name} pour installations de ventilation professionnelles, avec conseil et livraison par Aération Ventilation.`;

  return {
    title: `${name} - Aération Ventilation`,
    description: truncateSeoDescription(description),
  };
}

export function normalizeSeoPath(pathname = "/") {
  const rawPath = typeof pathname === "string" && pathname ? pathname : "/";
  const pathOnly = rawPath.split(/[?#]/, 1)[0] || "/";
  const pathWithLeadingSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`;

  return pathWithLeadingSlash.replace(/\/+$/, "") || "/";
}

function cleanSeoText(value, fallback) {
  if (typeof value !== "string") return fallback;

  return value.replace(/\s+/g, " ").trim() || fallback;
}

function truncateSeoDescription(value, maxLength = 165) {
  const description = cleanSeoText(value, "");
  if (description.length <= maxLength) return description;

  return `${description
    .slice(0, maxLength - 3)
    .trim()
    .replace(/[,\s;:.]+$/, "")}...`;
}

import { businessIdentity } from "./business.js";
import { isCategoryPath } from "./categories.js";

const defaultStructuredDataSiteUrl = "https://www.aeration-ventilation.fr";
const structuredDataExcludedPaths = new Set(["/admin", "/espace-client"]);
const breadcrumbLabelsByPath = {
  "/": "Accueil",
  "/boutique": "Boutique",
  "/a-propos": "A propos de nous",
  "/livraison": "Livraison",
  "/contact": "Contact",
  "/confidentialite": "Politique de confidentialité",
  "/conditions-generales-de-vente": "Conditions générales de vente",
};
const supportedStructuredDataCountries = ["France", "Belgique", "Suisse"];

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
      "Envoyez les informations utiles sur votre installation de ventilation et recevez une réponse écrite d'Aération Ventilation.",
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

export function getPageSeo(pathname, product, category) {
  const normalizedPath = normalizeSeoPath(pathname);

  if (product && normalizedPath.startsWith("/boutique/")) {
    return getProductSeo(product);
  }

  if (category && isCategoryPath(normalizedPath)) {
    return getCategorySeo(category);
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

export function getCategorySeo(category) {
  const name = cleanSeoText(category, "Catégorie");

  return {
    title: `${name} - Aération Ventilation`,
    description: truncateSeoDescription(
      `Découvrez les produits de ventilation de la catégorie ${name} proposés par Aération Ventilation pour vos projets professionnels.`,
    ),
  };
}

export function getStructuredData(pathname, product, canonicalUrl, category) {
  const normalizedPath = normalizeSeoPath(pathname);
  const seo = getPageSeo(normalizedPath, product, category);

  if (seo.robots?.includes("noindex") || !isStructuredDataRoute(normalizedPath, product, category)) {
    return null;
  }

  const urls = getStructuredDataUrls(normalizedPath, canonicalUrl);
  const graph = [
    createOrganizationNode(urls.siteUrl),
    createLocalBusinessNode(urls.siteUrl),
    createBreadcrumbListNode(normalizedPath, product, category, urls),
  ].filter(Boolean);

  if (product && normalizedPath.startsWith("/boutique/")) {
    graph.push(createProductNode(product, seo, urls));
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
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

function isStructuredDataRoute(pathname, product, category) {
  if (structuredDataExcludedPaths.has(pathname)) return false;
  if (product && pathname.startsWith("/boutique/")) return true;
  if (category && isCategoryPath(pathname)) return true;

  return Boolean(pageSeo[pathname]);
}

function getStructuredDataUrls(pathname, canonicalUrl) {
  const canonical =
    getAbsoluteUrl(canonicalUrl, defaultStructuredDataSiteUrl) ||
    new URL(normalizeSeoPath(pathname), `${defaultStructuredDataSiteUrl}/`).toString();
  const canonicalUrlObject = new URL(canonical);
  const siteUrl = `${canonicalUrlObject.origin}/`;

  return {
    canonicalUrl: canonical,
    siteUrl,
  };
}

function createOrganizationNode(siteUrl) {
  const organizationId = getOrganizationId(siteUrl);
  const organization = {
    "@type": "Organization",
    "@id": organizationId,
    name: businessIdentity.tradeName,
    legalName: businessIdentity.companyName,
    url: siteUrl,
    logo: {
      "@type": "ImageObject",
      url: new URL("/favicon.ico", siteUrl).toString(),
    },
    email: businessIdentity.email,
    identifier: businessIdentity.registrationNumber,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        email: businessIdentity.email,
        areaServed: supportedStructuredDataCountries,
        availableLanguage: ["fr"],
      },
    ],
  };

  if (businessIdentity.phone) {
    organization.telephone = businessIdentity.phone;
    organization.contactPoint[0].telephone = businessIdentity.phone;
  }

  return organization;
}

function createLocalBusinessNode(siteUrl) {
  const localBusiness = {
    "@type": "LocalBusiness",
    "@id": new URL("#local-business", siteUrl).toString(),
    name: businessIdentity.tradeName,
    legalName: businessIdentity.companyName,
    url: siteUrl,
    image: new URL("/favicon.ico", siteUrl).toString(),
    email: businessIdentity.email,
    priceRange: "€€",
    parentOrganization: {
      "@id": getOrganizationId(siteUrl),
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "UPI 1-237",
      addressLocality: "Slaveykovo",
      postalCode: "9247",
      addressRegion: "Varna",
      addressCountry: "BG",
    },
    areaServed: supportedStructuredDataCountries.map((country) => ({
      "@type": "Country",
      name: country,
    })),
  };

  if (businessIdentity.phone) {
    localBusiness.telephone = businessIdentity.phone;
  }

  return localBusiness;
}

function createBreadcrumbListNode(pathname, product, category, { canonicalUrl, siteUrl }) {
  const items = [{ name: breadcrumbLabelsByPath["/"], path: "/" }];

  if (product && pathname.startsWith("/boutique/")) {
    items.push({ name: breadcrumbLabelsByPath["/boutique"], path: "/boutique" });
    items.push({ name: cleanSeoText(product.name, "Produit"), path: pathname });
  } else if (category && isCategoryPath(pathname)) {
    items.push({ name: breadcrumbLabelsByPath["/boutique"], path: "/boutique" });
    items.push({ name: cleanSeoText(category, "Catégorie"), path: pathname });
  } else if (pathname !== "/") {
    items.push({
      name: breadcrumbLabelsByPath[pathname] || getPageSeo(pathname).title,
      path: pathname,
    });
  }

  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl.replace(/#.*$/, "")}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: index === items.length - 1 ? canonicalUrl : new URL(item.path, siteUrl).toString(),
    })),
  };
}

function createProductNode(product, seo, { canonicalUrl, siteUrl }) {
  const name = cleanSeoText(product?.name, "Produit");
  const imageUrl = getProductImageUrl(product, siteUrl);
  const amount = Number.parseInt(product?.amount, 10);
  const productNode = {
    "@type": "Product",
    "@id": `${canonicalUrl.replace(/#.*$/, "")}#product`,
    name,
    description: seo.description,
    sku: cleanSeoText(product?.slug, name),
    category: cleanSeoText(product?.category, "Ventilation"),
    brand: {
      "@type": "Brand",
      name: businessIdentity.tradeName,
    },
    url: canonicalUrl,
  };

  if (imageUrl) {
    productNode.image = [imageUrl];
  }

  if (Number.isInteger(amount) && amount >= 0) {
    productNode.offers = {
      "@type": "Offer",
      url: canonicalUrl,
      priceCurrency: "EUR",
      price: (amount / 100).toFixed(2),
      availability:
        product?.active === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@id": getOrganizationId(siteUrl),
      },
    };
  }

  return productNode;
}

function getProductImageUrl(product, siteUrl) {
  const imageUrl = cleanSeoText(product?.imageUrl || product?.image, "");
  if (!imageUrl || imageUrl.startsWith("data:")) return "";

  return getAbsoluteUrl(imageUrl, siteUrl);
}

function getOrganizationId(siteUrl) {
  return new URL("#organization", siteUrl).toString();
}

function getAbsoluteUrl(value, baseUrl) {
  const urlValue = cleanSeoText(value, "");
  if (!urlValue) return "";

  try {
    const url = new URL(urlValue, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
    if (!["http:", "https:"].includes(url.protocol)) return "";

    return url.toString();
  } catch {
    return "";
  }
}

function truncateSeoDescription(value, maxLength = 165) {
  const description = cleanSeoText(value, "");
  if (description.length <= maxLength) return description;

  return `${description
    .slice(0, maxLength - 3)
    .trim()
    .replace(/[,\s;:.]+$/, "")}...`;
}

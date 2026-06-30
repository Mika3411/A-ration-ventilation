import { useEffect } from "react";

import { getCategoryFromPath } from "../data/categories.js";
import { getProductFromPath } from "../data/products.js";
import { getPageSeo, getStructuredData } from "../data/seo.js";

export function usePageSeo({ currentPath, productCategories, products }) {
  useEffect(() => {
    const currentProduct = getProductFromPath(currentPath, products);
    const currentCategory = getCategoryFromPath(currentPath, productCategories);
    const seo = getPageSeo(currentPath, currentProduct, currentCategory);
    const canonicalUrl = getCanonicalUrl(currentPath);

    document.title = seo.title;
    setLinkHref("canonical", canonicalUrl);
    setMetaContent("description", seo.description);
    setMetaContent("twitter:title", seo.title);
    setMetaContent("twitter:description", seo.description);
    setMetaProperty("og:title", seo.title);
    setMetaProperty("og:description", seo.description);
    setMetaProperty("og:url", canonicalUrl);
    setStructuredData(getStructuredData(currentPath, currentProduct, canonicalUrl, currentCategory));

    if (seo.robots) {
      setMetaContent("robots", seo.robots);
    } else {
      removeMetaContent("robots");
    }
  }, [currentPath, productCategories, products]);
}

function setMetaContent(name, content) {
  let meta = document.querySelector(`meta[name="${name}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", name);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setMetaProperty(property, content) {
  let meta = document.querySelector(`meta[property="${property}"]`);

  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("property", property);
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", content);
}

function setLinkHref(rel, href) {
  let link = document.querySelector(`link[rel="${rel}"]`);

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", rel);
    document.head.appendChild(link);
  }

  link.setAttribute("href", href);
}

function setStructuredData(structuredData) {
  const selector = 'script[type="application/ld+json"][data-seo-jsonld="primary"]';
  let script = document.querySelector(selector);

  if (!structuredData) {
    script?.remove();
    return;
  }

  if (!script) {
    script = document.createElement("script");
    script.setAttribute("type", "application/ld+json");
    script.setAttribute("data-seo-jsonld", "primary");
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
}

function removeMetaContent(name) {
  document.querySelector(`meta[name="${name}"]`)?.remove();
}

function getCanonicalUrl(pathname) {
  const currentCanonical = document.querySelector('link[rel="canonical"]')?.href;
  const origin = currentCanonical ? new URL(currentCanonical).origin : window.location.origin;

  return new URL(pathname, `${origin}/`).toString();
}

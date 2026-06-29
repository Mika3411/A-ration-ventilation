import { useEffect, useState } from "react";

import { routes } from "../data/site.js";

export function normalizePath(pathname) {
  const cleanPath = pathname.replace(/\/+$/, "") || "/";
  if (routes.some((route) => route.path === cleanPath)) return cleanPath;
  if (cleanPath === "/admin") return cleanPath;
  return cleanPath.startsWith("/boutique/") ? cleanPath : "/";
}

export function useRouter() {
  const [currentPath, setCurrentPath] = useState(() => normalizePath(window.location.pathname));

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(normalizePath(window.location.pathname));
      scrollToHashOrTop(window.location.hash);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    scrollToHashOrTop(window.location.hash);
  }, [currentPath]);

  function navigate(event, targetPath) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();

    const url = new URL(targetPath, window.location.origin);
    const nextPath = normalizePath(url.pathname);
    const nextUrl = `${nextPath}${url.hash}`;

    window.history.pushState({}, "", nextUrl);
    setCurrentPath(nextPath);
    scrollToHashOrTop(url.hash);
  }

  return { currentPath, navigate };
}

function scrollToHashOrTop(hash) {
  window.setTimeout(() => {
    if (hash) {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }, 0);
}

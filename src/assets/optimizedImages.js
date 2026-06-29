import heroAvif from "./hero-rooftop-ductwork.avif";
import heroFallback from "./hero-rooftop-ductwork-optimized.jpg";
import heroWebp from "./hero-rooftop-ductwork.webp";
import brandLogoAvif from "./logo-aeration-ventilation-rounded-384.avif";
import brandLogoFallback from "./logo-aeration-ventilation-rounded-384.png";
import brandLogoWebp from "./logo-aeration-ventilation-rounded-384.webp";

export const brandLogoSources = {
  avif: brandLogoAvif,
  fallback: brandLogoFallback,
  webp: brandLogoWebp,
};

export function getHeroBackgroundStyle(gradient) {
  return {
    "--hero-gradient": gradient,
    "--hero-fallback-image": `url("${heroFallback}")`,
    "--hero-image-set": `image-set(url("${heroAvif}") type("image/avif"), url("${heroWebp}") type("image/webp"), url("${heroFallback}") type("image/jpeg"))`,
  };
}

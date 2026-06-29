import { getHeroBackgroundStyle } from "../assets/optimizedImages.js";

const pageHeroGradient =
  "linear-gradient(90deg, rgba(5, 5, 4, 0.96), rgba(13, 9, 6, 0.86), rgba(255, 107, 33, 0.24))";

export function PageHero({ title, text }) {
  return (
    <section
      className="page-hero"
      style={getHeroBackgroundStyle(pageHeroGradient)}
    >
      <div className="container page-hero-content">
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}

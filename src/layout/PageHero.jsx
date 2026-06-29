import heroImage from "../assets/hero-rooftop-ductwork.png";

export function PageHero({ title, text }) {
  return (
    <section
      className="page-hero"
      style={{
        backgroundImage: `linear-gradient(90deg, rgba(5, 16, 51, 0.95), rgba(5, 16, 51, 0.8), rgba(5, 16, 51, 0.24)), url(${heroImage})`,
      }}
    >
      <div className="container page-hero-content">
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}

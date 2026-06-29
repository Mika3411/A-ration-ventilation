export function PageHero({ title, text }) {
  return (
    <section className="page-hero">
      <div className="container page-hero-content">
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </section>
  );
}

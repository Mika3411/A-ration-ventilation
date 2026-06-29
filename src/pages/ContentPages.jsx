import { ArrowRight, Phone, Truck } from "lucide-react";

import { deliverySteps, reasons, services } from "../data/site.js";
import { PageHero } from "../layout/PageHero.jsx";
import { RouteLink } from "../layout/Layout.jsx";
import { FeaturedGallery, ProductPreview } from "../boutique/Boutique.jsx";
import { ContactBand } from "../contact/Contact.jsx";

export function Hero({ currentPath, onNavigate }) {
  return (
    <section className="hero">
      <div className="container hero-content">
        <h1>Ventilateurs industriels et systèmes de ventilation</h1>
        <p className="hero-lead">
          Aération Ventilation est le représentant en France, Belgique et en Suisse.
        </p>
        <p>
          Nous proposons une large sélection de ventilateurs industriels haute et moyenne puissance,
          disponibles avec différents débits d'air pour s'adapter à tous les types de projets.
        </p>
        <div className="hero-actions">
          <RouteLink
            className="button button-primary"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/contact#devis"
          >
            Demander un devis
            <ArrowRight size={18} />
          </RouteLink>
          <RouteLink
            className="button button-secondary"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/contact"
          >
            <Phone size={18} />
            Contactez-nous
          </RouteLink>
        </div>
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section className="section services-section">
      <div className="container">
        <div className="section-heading">
          <h2>Nos services</h2>
          <p>
            Une offre complète pour choisir, dimensionner, fournir et suivre vos équipements de
            ventilation industrielle.
          </p>
        </div>
        <div className="service-track" aria-label="Services Aération Ventilation">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <article className="service-item" key={service.title}>
                <span className="step-number">{String(index + 1).padStart(2, "0")}</span>
                <Icon className="service-icon" size={34} strokeWidth={1.8} />
                <h3>{service.title}</h3>
                <p>{service.text}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function AboutIntro({ currentPath, onNavigate }) {
  return (
    <section className="section about-section">
      <div className="container about-layout">
        <div className="about-copy">
          <h2>Aération Ventilation accompagne vos projets d'air industriel</h2>
          <p>
            Aération Ventilation est le représentant exclusif en France, Belgique et en Suisse.
            Notre rôle est de simplifier le choix des équipements et de proposer des solutions
            adaptées aux installations industrielles, commerciales et résidentielles exigeantes.
          </p>
          <p>
            Les systèmes proposés couvrent les ventilateurs industriels, les accessoires, les
            conduits d'air, les grilles, les régulateurs et les solutions de traitement de l'air.
          </p>
          <RouteLink
            className="button button-primary"
            currentPath={currentPath}
            onNavigate={onNavigate}
            path="/contact#devis"
          >
            Contactez-nous
            <ArrowRight size={18} />
          </RouteLink>
        </div>
        <div className="about-panel">
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <article key={reason.title}>
                <Icon size={28} />
                <div>
                  <h3>{reason.title}</h3>
                  <p>{reason.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function WhyChoose() {
  return (
    <section className="section reasons-section">
      <div className="container">
        <div className="section-heading">
          <h2>Pourquoi choisir Aération Ventilation ?</h2>
        </div>
        <div className="reason-grid">
          {reasons.map((reason) => {
            const Icon = reason.icon;
            return (
              <article className="reason-item" key={reason.title}>
                <Icon size={34} strokeWidth={1.8} />
                <div>
                  <h3>{reason.title}</h3>
                  <p>{reason.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function DeliveryDetails({ currentPath, onNavigate }) {
  return (
    <section className="section delivery-section">
      <div className="container delivery-layout">
        <div>
          <h2>Livraison sous 3 à 4 semaines</h2>
          <p>
            Les délais varient selon le produit, les quantités et la destination. L'équipe vous
            confirme les conditions avant validation pour éviter les surprises sur chantier.
          </p>
          <div className="delivery-countries">
            <span>France</span>
            <span>Belgique</span>
            <span>Suisse</span>
          </div>
        </div>
        <div className="delivery-steps">
          {deliverySteps.map((step, index) => (
            <article key={step.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="container delivery-cta">
        <Truck size={34} />
        <p>Besoin d'une estimation de délai pour un produit précis ?</p>
        <RouteLink
          className="button button-primary"
          currentPath={currentPath}
          onNavigate={onNavigate}
          path="/contact#devis"
        >
          Demander un devis
          <ArrowRight size={18} />
        </RouteLink>
      </div>
    </section>
  );
}

export function HomePage({ cartItems, currentPath, onAddToCart, onNavigate, products }) {
  return (
    <>
      <Hero currentPath={currentPath} onNavigate={onNavigate} />
      <Services />
      <FeaturedGallery
        cartItems={cartItems}
        currentPath={currentPath}
        onAddToCart={onAddToCart}
        onNavigate={onNavigate}
        products={products}
      />
      <ProductPreview
        currentPath={currentPath}
        onNavigate={onNavigate}
        products={products}
      />
      <WhyChoose />
      <ContactBand />
    </>
  );
}

export function AboutPage({ currentPath, onNavigate }) {
  return (
    <>
      <PageHero
        title="A Propos De Nous"
        text="Un interlocuteur spécialisé pour vos équipements de ventilation en France, Belgique et Suisse."
      />
      <AboutIntro currentPath={currentPath} onNavigate={onNavigate} />
      <Services />
      <WhyChoose />
    </>
  );
}

export function DeliveryPage({ currentPath, onNavigate }) {
  return (
    <>
      <PageHero
        title="Livraison"
        text="Des délais clairs, une préparation suivie et une livraison organisée selon votre destination."
      />
      <DeliveryDetails currentPath={currentPath} onNavigate={onNavigate} />
    </>
  );
}

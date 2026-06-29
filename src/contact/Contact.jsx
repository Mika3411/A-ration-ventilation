import { useState } from "react";

import { ArrowRight, CheckCircle2, FileText, Mail, MapPin } from "lucide-react";

import { businessIdentity } from "../data/business.js";
import { googleMapsEmbedUrl } from "../data/site.js";

import { PageHero } from "../layout/PageHero.jsx";

export function QuoteSection() {
  const [formStatus, setFormStatus] = useState("idle");
  const [formMessage, setFormMessage] = useState("");
  const isSending = formStatus === "sending";

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setFormStatus("sending");
    setFormMessage("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible d'envoyer la demande.");
      }

      form.reset();
      setFormStatus("sent");
      setFormMessage("Merci, votre demande de devis a bien été envoyée.");
    } catch (error) {
      setFormStatus("error");
      setFormMessage(
        error instanceof Error
          ? error.message
          : "Impossible d'envoyer la demande pour le moment.",
      );
    }
  }

  return (
    <section id="devis" className="section quote-section">
      <div className="container quote-panel">
        <div className="quote-copy">
          <h2>Recevez une réponse claire par écrit</h2>
          <p>
            Indiquez le type d'équipement recherché, les dimensions utiles, le débit attendu ou
            quelques photos de l'installation. Nous revenons vers vous avec une réponse exploitable,
            sans appel inutile.
          </p>
          <div className="quote-points">
            <span>
              <CheckCircle2 size={18} />
              Échanges par écrit
            </span>
            <span>
              <CheckCircle2 size={18} />
              Livraison incluse dans le prix
            </span>
          </div>
        </div>
        <form className="quote-form" onSubmit={handleSubmit}>
          <div className="honeypot-field" aria-hidden="true">
            <label>
              Site web
              <input name="website" tabIndex="-1" autoComplete="off" />
            </label>
          </div>
          <div className="field-row">
            <label>
              Nom
              <input name="name" required placeholder="Votre nom" autoComplete="name" />
            </label>
            <label>
              Téléphone
              <input name="phone" required placeholder="+33..." autoComplete="tel" />
            </label>
          </div>
          <label>
            Besoin
            <select name="need" defaultValue="Ventilateurs industriels">
              <option>Ventilateurs industriels</option>
              <option>Ventilation de restaurant</option>
              <option>Grilles de ventilation</option>
              <option>Régulation et accessoires</option>
            </select>
          </label>
          <label>
            Message
            <textarea
              name="message"
              placeholder="Décrivez le projet, le lieu et les contraintes connues."
            />
          </label>
          <button className="button button-primary" type="submit" disabled={isSending}>
            {isSending ? "Envoi en cours..." : "Envoyer la demande"}
            <ArrowRight size={18} />
          </button>
          {formMessage && (
            <p
              className={formStatus === "error" ? "form-error" : "form-success"}
              role={formStatus === "error" ? "alert" : "status"}
            >
              {formMessage}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}

export function ContactIntro() {
  return (
    <section className="section contact-intro">
      <div className="container contact-intro-grid">
        <article>
          <MapPin size={36} />
          <h2>Adresse</h2>
          <p>{businessIdentity.address}</p>
        </article>
        <article>
          <FileText size={36} />
          <h2>Devis</h2>
          <p>Un descriptif précis suffit pour recevoir une première réponse</p>
        </article>
        <article>
          <Mail size={36} />
          <h2>Email</h2>
          <p>contact@aeration-ventilation.fr</p>
        </article>
      </div>
    </section>
  );
}

export function GoogleMapSection() {
  return (
    <section className="map-section" aria-labelledby="map-title">
      <div className="container map-layout">
        <div className="map-copy">
          <h2 id="map-title">Adresse de la société</h2>
          <p>
            Le site est exploité par DIXESTWEST Ltd, société immatriculée en Bulgarie. Les demandes,
            devis et suivis de commande sont traités par écrit afin de garder des informations
            claires sur chaque projet.
          </p>
          <div className="map-contact-list">
            <span>
              <MapPin size={20} />
              {businessIdentity.address}
            </span>
            <span>
              <Mail size={20} />
              {businessIdentity.email}
            </span>
          </div>
        </div>
        <div className="map-frame" aria-label="Carte Google Maps Aération Ventilation">
          <iframe
            title="Google Maps - Aération Ventilation"
            src={googleMapsEmbedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}

export function ContactBand() {
  return (
    <section className="contact-band" aria-label="Coordonnées">
      <div className="container contact-grid">
        <div>
          <MapPin size={34} />
          <span>Adresse</span>
          <strong>DIXESTWEST Ltd, Bulgarie</strong>
        </div>
        <div>
          <FileText size={34} />
          <span>Devis</span>
          <strong>Formulaire de contact</strong>
        </div>
        <div>
          <Mail size={34} />
          <span>Email</span>
          <strong>{businessIdentity.email}</strong>
        </div>
      </div>
    </section>
  );
}

export function ContactPage() {
  return (
    <>
      <PageHero
        title="Contact"
        text="Envoyez les informations utiles sur votre installation et recevez une réponse écrite."
      />
      <ContactIntro />
      <GoogleMapSection />
      <QuoteSection />
    </>
  );
}

import { useState } from "react";

import { ArrowRight, CheckCircle2, Mail, MapPin, Phone } from "lucide-react";

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
          <h2>Parlez-nous de votre installation</h2>
          <p>
            Débit d'air, contraintes du bâtiment, destination de livraison : envoyez les premiers
            éléments et l'équipe revient vers vous avec une proposition adaptée.
          </p>
          <div className="quote-points">
            <span>
              <CheckCircle2 size={18} />
              Réponse personnalisée
            </span>
            <span>
              <CheckCircle2 size={18} />
              Livraison 3 à 4 semaines
            </span>
          </div>
        </div>
        <form className="quote-form" onSubmit={handleSubmit}>
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
          <h2>Nous trouver</h2>
          <p>France</p>
        </article>
        <article>
          <Phone size={36} />
          <h2>Nous appeler</h2>
          <p>+09 876 543 210</p>
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
          <h2 id="map-title">Nous situer</h2>
          <p>
            Aération Ventilation accompagne les projets en France, Belgique et Suisse. La carte
            permet de localiser rapidement la zone de recherche et de préparer votre demande.
          </p>
          <div className="map-contact-list">
            <span>
              <MapPin size={20} />
              France
            </span>
            <span>
              <Phone size={20} />
              +09 876 543 210
            </span>
            <span>
              <Mail size={20} />
              contact@aeration-ventilation.fr
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
          <span>Nous trouver</span>
          <strong>France</strong>
        </div>
        <div>
          <Phone size={34} />
          <span>Nous appeler</span>
          <strong>+09 876 543 210</strong>
        </div>
        <div>
          <Mail size={34} />
          <span>Email</span>
          <strong>contact@aeration-ventilation.fr</strong>
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
        text="Décrivez votre besoin, demandez un devis ou contactez directement l'équipe Aération Ventilation."
      />
      <ContactIntro />
      <GoogleMapSection />
      <QuoteSection />
    </>
  );
}

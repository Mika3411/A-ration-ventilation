import { ArrowRight, Phone, Truck } from "lucide-react";

import { deliverySteps, legalIdentity, reasons, services } from "../data/site.js";
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

const legalUpdatedAt = "29 juin 2026";

function LegalSummary({ items, title }) {
  return (
    <aside className="legal-summary" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}

function LegalArticle({ children, title }) {
  return (
    <article className="legal-article">
      <h2>{title}</h2>
      {children}
    </article>
  );
}

function LegalIdentityList({ rows }) {
  return (
    <dl className="legal-identity">
      {rows.map((row) => (
        <div key={row.label}>
          <dt>{row.label}</dt>
          <dd className={row.pending ? "legal-placeholder" : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LegalCompletionNotice() {
  return (
    <p className="legal-warning">
      Les champs indiqués "À compléter" doivent être remplacés par les informations légales exactes
      avant la mise en ligne définitive.
    </p>
  );
}

export function PrivacyPage() {
  return (
    <>
      <PageHero
        title="Politique de confidentialité"
        text="Les informations sur les données personnelles collectées, leurs usages et vos droits."
      />
      <section className="section legal-section">
        <div className="container legal-layout">
          <LegalSummary
            title="En bref"
            items={[
              "Les données servent aux demandes de devis, aux commandes et à l'espace client.",
              "Le paiement est traité par Stripe ; aucune carte bancaire n'est stockée par le site.",
              "Vous pouvez exercer vos droits par email à tout moment.",
            ]}
          />
          <div className="legal-content">
            <p className="legal-updated">Dernière mise à jour : {legalUpdatedAt}</p>
            <LegalCompletionNotice />

            <LegalArticle title="1. Responsable du traitement">
              <p>
                Le responsable du traitement des données personnelles collectées sur ce site est{" "}
                {legalIdentity.companyName}, qui exploite le site sous le nom commercial{" "}
                {legalIdentity.tradeName}.
              </p>
              <LegalIdentityList
                rows={[
                  { label: "Société", value: legalIdentity.companyName },
                  { label: "Nom commercial", value: legalIdentity.tradeName },
                  { label: "Forme juridique", value: legalIdentity.legalForm },
                  { label: "Pays d'établissement", value: legalIdentity.country },
                  { label: "Adresse du siège", value: legalIdentity.address },
                  { label: "Email", value: legalIdentity.email },
                  ...(legalIdentity.phone
                    ? [{ label: "Téléphone", value: legalIdentity.phone }]
                    : []),
                ]}
              />
            </LegalArticle>

            <LegalArticle title="2. Données collectées">
              <p>
                Le site collecte uniquement les informations nécessaires aux services proposés,
                selon les formulaires et fonctionnalités utilisés.
              </p>
              <ul>
                <li>
                  Demande de contact ou de devis : nom, téléphone, besoin exprimé et message.
                </li>
                <li>
                  Espace client : prénom, nom, société, téléphone, email, mot de passe chiffré et
                  historique de commandes.
                </li>
                <li>
                  Commande et paiement : contenu du panier, coordonnées de facturation et de
                  livraison, statut de paiement, identifiants techniques Stripe.
                </li>
                <li>
                  Navigation technique : adresse IP, journaux de sécurité, cookie de session
                  HTTP-only et panier conservé localement dans le navigateur.
                </li>
              </ul>
            </LegalArticle>

            <LegalArticle title="3. Finalités et bases légales">
              <ul>
                <li>
                  Répondre aux demandes de devis et de contact : mesures précontractuelles ou
                  intérêt légitime à traiter votre demande.
                </li>
                <li>
                  Créer et gérer un compte client : exécution du service demandé.
                </li>
                <li>
                  Préparer, payer, livrer et suivre une commande : exécution du contrat.
                </li>
                <li>
                  Respecter les obligations comptables, fiscales et de garantie : obligation
                  légale.
                </li>
                <li>
                  Sécuriser le site, prévenir les abus et limiter les tentatives automatisées :
                  intérêt légitime.
                </li>
              </ul>
            </LegalArticle>

            <LegalArticle title="4. Destinataires">
              <p>
                Les données sont destinées aux équipes de {legalIdentity.companyName} et aux
                prestataires nécessaires au fonctionnement du site : hébergement, email, base de
                données, paiement sécurisé Stripe et transporteurs ou partenaires logistiques
                lorsque la livraison le nécessite.
              </p>
            </LegalArticle>

            <LegalArticle title="5. Paiement sécurisé">
              <p>
                Les paiements sont redirigés vers Stripe. Les informations de carte bancaire sont
                saisies sur l'environnement sécurisé du prestataire de paiement et ne sont pas
                stockées par {legalIdentity.companyName}.
              </p>
            </LegalArticle>

            <LegalArticle title="6. Cookies et traceurs">
              <p>
                Le site utilise des éléments strictement nécessaires au fonctionnement du service,
                notamment un cookie de session sécurisé pour l'espace client et le stockage local du
                panier. La carte Google Maps intégrée peut charger des contenus externes de Google.
                Les traceurs non nécessaires, lorsqu'ils sont ajoutés, doivent faire l'objet d'une
                information claire et d'un consentement préalable.
              </p>
            </LegalArticle>

            <LegalArticle title="7. Durées de conservation">
              <ul>
                <li>Demandes de contact ou de devis : jusqu'à 3 ans après le dernier échange.</li>
                <li>
                  Données de compte client : pendant la durée d'utilisation du compte, puis
                  archivage si une obligation légale le justifie.
                </li>
                <li>
                  Données de commande et de facturation : durée légale de conservation applicable
                  aux pièces comptables et commerciales.
                </li>
                <li>
                  Journaux techniques et données de sécurité : durée limitée au besoin de sécurité
                  et d'administration du site.
                </li>
              </ul>
            </LegalArticle>

            <LegalArticle title="8. Vos droits">
              <p>
                Vous pouvez demander l'accès, la rectification, l'effacement, la limitation,
                l'opposition au traitement ou la portabilité de vos données lorsque ces droits sont
                applicables. Pour exercer vos droits, écrivez à{" "}
                <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a>. Vous pouvez
                également introduire une réclamation auprès de la CNIL.
              </p>
            </LegalArticle>

            <LegalArticle title="9. Sécurité et mises à jour">
              <p>
                {legalIdentity.companyName} met en place des mesures techniques raisonnables pour
                protéger les données : mots de passe chiffrés, cookies HTTP-only, limitation des
                tentatives abusives, en-têtes de sécurité et accès restreint aux outils
                d'administration. Cette politique peut être mise à jour pour refléter l'évolution du
                site ou des obligations applicables.
              </p>
            </LegalArticle>
          </div>
        </div>
      </section>
    </>
  );
}

export function TermsPage({ currentPath, onNavigate }) {
  return (
    <>
      <PageHero
        title="Conditions générales de vente"
        text="Les conditions applicables aux ventes de produits de ventilation proposées sur le site."
      />
      <section className="section legal-section">
        <div className="container legal-layout">
          <LegalSummary
            title="À retenir"
            items={[
              "Les commandes sont validées après confirmation du panier et paiement sécurisé.",
              "La livraison est estimée à 3 à 4 semaines selon le produit et la destination.",
              "Les garanties légales s'appliquent selon la qualité du client et le produit vendu.",
            ]}
          />
          <div className="legal-content">
            <p className="legal-updated">Dernière mise à jour : {legalUpdatedAt}</p>
            <LegalCompletionNotice />

            <LegalArticle title="1. Vendeur">
              <p>
                Les présentes conditions générales de vente sont conclues entre le client et{" "}
                {legalIdentity.companyName}, qui exploite le site sous le nom commercial{" "}
                {legalIdentity.tradeName}, vendeur de ventilateurs, accessoires et systèmes de
                ventilation.
              </p>
              <LegalIdentityList
                rows={[
                  { label: "Raison sociale", value: legalIdentity.companyName },
                  { label: "Nom commercial", value: legalIdentity.tradeName },
                  { label: "Forme juridique", value: legalIdentity.legalForm },
                  { label: "Pays d'établissement", value: legalIdentity.country },
                  { label: "Adresse du siège", value: legalIdentity.address },
                  {
                    label: "Numéro d'immatriculation",
                    value: legalIdentity.registrationNumber,
                  },
                  { label: "Numéro de TVA", value: legalIdentity.vatNumber, pending: true },
                  { label: "Email", value: legalIdentity.email },
                  ...(legalIdentity.phone
                    ? [{ label: "Téléphone", value: legalIdentity.phone }]
                    : []),
                  {
                    label: "Directeur de publication",
                    value: legalIdentity.publicationDirector,
                  },
                  { label: "Hébergeur", value: legalIdentity.host, pending: true },
                ]}
              />
            </LegalArticle>

            <LegalArticle title="2. Champ d'application">
              <p>
                Les CGV s'appliquent à toute commande passée sur le site ou à la suite d'un devis
                émis par {legalIdentity.companyName}. Elles concernent les clients consommateurs et
                professionnels, sauf conditions particulières écrites acceptées par les deux parties.
              </p>
            </LegalArticle>

            <LegalArticle title="3. Produits, conseils et devis">
              <p>
                Les produits présentés sont décrits avec leurs caractéristiques essentielles dans la
                mesure des informations disponibles. Pour les installations techniques, le client
                reste responsable de communiquer les contraintes du site, le débit attendu, la
                destination et toute information utile au choix du matériel. Un devis peut être
                demandé avant commande pour confirmer la compatibilité, les délais et les conditions
                de livraison.
              </p>
            </LegalArticle>

            <LegalArticle title="4. Prix">
              <p>
                Les prix sont indiqués en euros et incluent les frais de livraison standard vers les
                zones desservies. Aucun supplément de livraison standard n'est ajouté au panier,
                sauf demande spécifique du client, destination particulière, transport express,
                contrainte de manutention ou formalité exceptionnelle confirmée avant validation.
                {legalIdentity.companyName} se réserve le droit de modifier les prix à tout moment,
                mais le prix applicable est celui confirmé au moment de la commande ou du devis
                accepté.
              </p>
            </LegalArticle>

            <LegalArticle title="5. Commande et paiement">
              <p>
                La commande est validée lorsque le client confirme son panier et procède au paiement
                sécurisé. Le paiement est effectué par carte bancaire via Stripe, sauf accord écrit
                différent. La commande peut être refusée ou suspendue en cas de paiement incomplet,
                d'informations erronées, de suspicion de fraude ou d'impossibilité logistique
                manifeste.
              </p>
            </LegalArticle>

            <LegalArticle title="6. Livraison">
              <p>
                Les livraisons sont proposées en France, Belgique et Suisse. Le délai indicatif est
                généralement de 3 à 4 semaines, sous réserve de disponibilité, de validation du
                paiement, de contraintes transport et de destination. La livraison standard est
                incluse dans le prix affiché. Le client doit vérifier l'état du colis à réception et
                signaler rapidement toute anomalie, réserve ou dommage de transport.
              </p>
            </LegalArticle>

            <LegalArticle title="7. Droit de rétractation et retours">
              <p>
                Le client consommateur dispose en principe d'un délai de 14 jours à compter de la
                réception pour exercer son droit de rétractation, sauf exception légale, notamment
                pour les biens confectionnés selon les spécifications du client ou nettement
                personnalisés. Les produits retournés doivent être complets, non installés, non
                détériorés et dans un état permettant leur remise en vente. Les frais de retour sont
                à la charge du client, sauf erreur imputable au vendeur ou produit non conforme.
              </p>
              <p>
                Pour les clients professionnels, le droit de rétractation ne s'applique pas sauf
                disposition impérative contraire ou accord écrit spécifique.
              </p>
            </LegalArticle>

            <LegalArticle title="8. Garanties">
              <p>
                Les clients consommateurs bénéficient des garanties légales applicables, notamment la
                garantie légale de conformité et la garantie contre les vices cachés. Les clients
                professionnels bénéficient des garanties prévues par la loi et, le cas échéant, par
                le fabricant. Toute garantie commerciale ou constructeur est précisée sur le devis,
                la fiche produit ou les documents fournis avec le produit.
              </p>
            </LegalArticle>

            <LegalArticle title="9. Réserve de propriété et transfert des risques">
              <p>
                Les produits demeurent la propriété de {legalIdentity.companyName} jusqu'au paiement
                complet du prix. Le transfert des risques intervient selon les règles applicables au
                type de client et au mode de livraison retenu, sous réserve des dispositions légales
                impératives.
              </p>
            </LegalArticle>

            <LegalArticle title="10. Responsabilité">
              <p>
                {legalIdentity.companyName} ne peut être tenue responsable des dommages résultant
                d'une mauvaise installation, d'une utilisation non conforme, d'un défaut
                d'entretien, d'informations techniques incomplètes fournies par le client ou d'une
                modification du produit non autorisée. Pour les projets techniques, il appartient au
                client de vérifier que le matériel choisi respecte les contraintes réglementaires et
                techniques de son installation.
              </p>
            </LegalArticle>

            <LegalArticle title="11. Données personnelles">
              <p>
                Les données personnelles collectées lors des commandes et demandes de devis sont
                traitées conformément à la{" "}
                <RouteLink
                  currentPath={currentPath}
                  onNavigate={onNavigate}
                  path="/confidentialite"
                >
                  politique de confidentialité
                </RouteLink>
                .
              </p>
            </LegalArticle>

            <LegalArticle title="12. Réclamations, médiation et droit applicable">
              <p>
                Pour toute réclamation, le client peut contacter{" "}
                <a href={`mailto:${legalIdentity.email}`}>{legalIdentity.email}</a>. En cas de
                litige non résolu avec un consommateur, le client peut recourir gratuitement à un
                médiateur de la consommation.
              </p>
              <LegalIdentityList
                rows={[
                  {
                    label: "Médiateur de la consommation",
                    value: legalIdentity.mediator,
                    pending: true,
                  },
                ]}
              />
              <p>
                Les CGV sont soumises au droit français, sous réserve des règles impératives
                applicables au client consommateur dans son pays de résidence.
              </p>
            </LegalArticle>
          </div>
        </div>
      </section>
    </>
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

export function NotFoundPage({ currentPath, onNavigate }) {
  return (
    <>
      <PageHero
        title="Page introuvable"
        text="Cette adresse n'existe pas ou n'est plus disponible sur Aération Ventilation."
      />
      <section className="section not-found-section" aria-labelledby="not-found-title">
        <div className="container not-found-layout">
          <span className="not-found-code">404</span>
          <h2 id="not-found-title">Retrouvez rapidement la bonne rubrique</h2>
          <p>
            La page demandée a peut-être changé d'adresse. La boutique, les informations de
            livraison et le formulaire de contact restent accessibles.
          </p>
          <div className="not-found-actions">
            <RouteLink
              className="button button-primary"
              currentPath={currentPath}
              onNavigate={onNavigate}
              path="/boutique"
            >
              Voir la boutique
              <ArrowRight size={18} />
            </RouteLink>
            <RouteLink
              className="button button-secondary"
              currentPath={currentPath}
              onNavigate={onNavigate}
              path="/contact"
            >
              Contacter l'équipe
            </RouteLink>
          </div>
        </div>
      </section>
    </>
  );
}

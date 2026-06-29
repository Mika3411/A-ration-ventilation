import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  LogIn,
  LogOut,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  UserRound,
} from "lucide-react";

import { PageHero } from "../layout/PageHero.jsx";
import { RouteLink } from "../layout/Layout.jsx";

export function CustomerPortalPage({ currentPath, onNavigate }) {
  const [authMode, setAuthMode] = useState("register");
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [orders, setOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState("idle");
  const isSubmitting = status === "submitting";

  useEffect(() => {
    let ignore = false;

    async function loadCustomer() {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));

        if (ignore) return;

        setCustomer(payload.user || null);
        setStatus("idle");

        if (payload.authAvailable === false) {
          setMessageType("error");
          setMessage(
            "L'espace client sera actif dès que Render Postgres et la clé de session seront configurés.",
          );
        }
      } catch {
        if (ignore) return;
        setStatus("idle");
        setMessageType("error");
        setMessage("Impossible de vérifier la session client pour le moment.");
      }
    }

    loadCustomer();
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!customer) {
      setOrders([]);
      setOrdersStatus("idle");
      return undefined;
    }

    let ignore = false;

    async function loadOrders() {
      setOrdersStatus("loading");

      try {
        const response = await fetch("/api/orders", {
          credentials: "include",
        });
        const payload = await response.json().catch(() => ({}));

        if (ignore) return;

        if (!response.ok) {
          throw new Error(payload.error || "Impossible de charger les commandes.");
        }

        setOrders(Array.isArray(payload.orders) ? payload.orders : []);
        setOrdersStatus("ready");
      } catch {
        if (ignore) return;
        setOrdersStatus("error");
      }
    }

    loadOrders();
    return () => {
      ignore = true;
    };
  }, [customer]);

  function switchAuthMode(nextMode) {
    setAuthMode(nextMode);
    setMessage("");
    setMessageType("success");
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const endpoint = authMode === "register" ? "/api/auth/register" : "/api/auth/login";

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(Object.fromEntries(formData.entries())),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Impossible de traiter la demande.");
      }

      form.reset();
      setCustomer(payload.user);
      setStatus("idle");
      setMessageType("success");
      setMessage(authMode === "register" ? "Compte client créé." : "Connexion réussie.");
    } catch (error) {
      setStatus("idle");
      setMessageType("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Impossible de traiter la demande pour le moment.",
      );
    }
  }

  async function handleLogout() {
    setStatus("submitting");
    setMessage("");

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setCustomer(null);
      setAuthMode("login");
      setStatus("idle");
      setMessageType("success");
      setMessage("Vous êtes déconnecté.");
    }
  }

  return (
    <>
      <PageHero
        title="Espace client"
        text="Créez votre compte, retrouvez vos informations et préparez vos prochaines demandes."
      />
      <section className="section customer-section">
        <div className="container customer-shell">
          <div className="customer-intro">
            <h2>Votre compte Aération Ventilation</h2>
            <p>
              Un espace simple pour centraliser les coordonnées client, les demandes de devis et le
              suivi des échanges commerciaux.
            </p>
            <div className="customer-benefits">
              <span>
                <ShieldCheck size={18} />
                Session sécurisée
              </span>
              <span>
                <ClipboardList size={18} />
                Demandes centralisées
              </span>
              <span>
                <Building2 size={18} />
                Profil entreprise
              </span>
            </div>
          </div>

          {customer ? (
            <div className="customer-dashboard" aria-live="polite">
              <div className="customer-dashboard-head">
                <div className="customer-avatar" aria-hidden="true">
                  {getCustomerInitials(customer)}
                </div>
                <div>
                  <span>Connecté</span>
                  <h2>Bonjour {customer.firstName}</h2>
                  <p>{customer.email}</p>
                </div>
                <button className="button button-dark" type="button" onClick={handleLogout}>
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
              <div className="customer-dashboard-grid">
                <article>
                  <UserRound size={28} />
                  <h3>Profil client</h3>
                  <p>
                    {customer.firstName} {customer.lastName}
                    {customer.company ? ` - ${customer.company}` : ""}
                  </p>
                  <span>Compte créé le {formatCustomerDate(customer.createdAt)}</span>
                </article>
                <article>
                  <ClipboardList size={28} />
                  <h3>Demandes de devis</h3>
                  <p>Préparez une nouvelle demande avec vos coordonnées déjà prêtes.</p>
                  <RouteLink
                    className="customer-card-link"
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    path="/contact#devis"
                  >
                    Demander un devis
                    <ArrowRight size={16} />
                  </RouteLink>
                </article>
                <article>
                  <ShoppingCart size={28} />
                  <h3>Commandes</h3>
                  <p>
                    {ordersStatus === "loading"
                      ? "Chargement des commandes..."
                      : orders.length
                        ? `${orders.length} commande${orders.length > 1 ? "s" : ""} enregistrée${orders.length > 1 ? "s" : ""}.`
                        : "Les commandes en ligne apparaîtront ici après paiement et validation."}
                  </p>
                  <RouteLink
                    className="customer-card-link"
                    currentPath={currentPath}
                    onNavigate={onNavigate}
                    path="/boutique"
                  >
                    Voir la boutique
                    <ArrowRight size={16} />
                  </RouteLink>
                </article>
              </div>
              <CustomerOrders orders={orders} status={ordersStatus} />
              {message && (
                <p className={messageType === "error" ? "form-error" : "form-success"} role="status">
                  {message}
                </p>
              )}
            </div>
          ) : (
            <div className="customer-form-card">
              <div className="customer-tabs" role="tablist" aria-label="Accès espace client">
                <button
                  className={authMode === "register" ? "is-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={authMode === "register"}
                  onClick={() => switchAuthMode("register")}
                >
                  <UserPlus size={18} />
                  Inscription
                </button>
                <button
                  className={authMode === "login" ? "is-active" : ""}
                  type="button"
                  role="tab"
                  aria-selected={authMode === "login"}
                  onClick={() => switchAuthMode("login")}
                >
                  <LogIn size={18} />
                  Connexion
                </button>
              </div>

              {status === "loading" ? (
                <p className="auth-note">Chargement de l'espace client...</p>
              ) : (
                <form className="customer-form" onSubmit={handleAuthSubmit}>
                  {authMode === "register" && (
                    <>
                      <div className="field-row">
                        <label>
                          Prénom
                          <input name="firstName" required autoComplete="given-name" />
                        </label>
                        <label>
                          Nom
                          <input name="lastName" required autoComplete="family-name" />
                        </label>
                      </div>
                      <div className="field-row">
                        <label>
                          Société
                          <input name="company" autoComplete="organization" />
                        </label>
                        <label>
                          Téléphone
                          <input name="phone" autoComplete="tel" />
                        </label>
                      </div>
                    </>
                  )}
                  <label>
                    Email
                    <input name="email" type="email" required autoComplete="email" />
                  </label>
                  <label>
                    Mot de passe
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      autoComplete={authMode === "register" ? "new-password" : "current-password"}
                    />
                  </label>
                  <p className="auth-note">Mot de passe de 8 caractères minimum.</p>
                  <button className="button button-primary" type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? "Traitement..."
                      : authMode === "register"
                        ? "Créer mon compte"
                        : "Me connecter"}
                    <ArrowRight size={18} />
                  </button>
                  {message && (
                    <p
                      className={messageType === "error" ? "form-error" : "form-success"}
                      role={messageType === "error" ? "alert" : "status"}
                    >
                      {message}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function CustomerOrders({ orders, status }) {
  return (
    <div className="customer-orders" aria-label="Commandes client">
      <div className="customer-orders-head">
        <h3>Mes commandes</h3>
        <span>{orders.length}</span>
      </div>
      {status === "loading" && <p className="auth-note">Chargement des commandes...</p>}
      {status === "error" && (
        <p className="form-error" role="status">
          Impossible de charger les commandes pour le moment.
        </p>
      )}
      {status !== "loading" && status !== "error" && orders.length === 0 && (
        <p className="auth-note">Aucune commande payée n'est encore rattachée à ce compte.</p>
      )}
      {orders.length > 0 && (
        <div className="customer-order-list">
          {orders.map((order) => (
            <article className="customer-order" key={order.id}>
              <div className="customer-order-summary">
                <div>
                  <strong>{order.total}</strong>
                  <span>{getOrderStatusLabel(order.status)}</span>
                </div>
                <small>{formatCustomerDate(order.completedAt || order.createdAt)}</small>
              </div>
              <ul>
                {(order.items || []).map((item) => (
                  <li key={`${order.id}-${item.slug}`}>
                    <span>
                      {item.quantity} x {item.name || item.slug}
                    </span>
                    <strong>{formatOrderAmount(item.lineTotal || item.amount * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function getCustomerInitials(customer) {
  return [customer.firstName, customer.lastName]
    .filter(Boolean)
    .map((value) => value[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatCustomerDate(value) {
  if (!value) return "aujourd'hui";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "aujourd'hui";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatOrderAmount(amount) {
  return `${Math.round((Number.parseInt(amount, 10) || 0) / 100).toLocaleString("fr-FR")} €`;
}

function getOrderStatusLabel(status) {
  if (status === "paid") return "Payée";
  if (status === "pending") return "En attente";
  return "Confirmée";
}

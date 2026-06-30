import { useEffect, useState } from "react";
import {
  ArrowRight,
  Building2,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  LogIn,
  LogOut,
  Save,
  ShieldCheck,
  ShoppingCart,
  UserPlus,
  UserRound,
} from "lucide-react";

import { RouteLink } from "../layout/Layout.jsx";

const emptyProfileForm = {
  firstName: "",
  lastName: "",
  company: "",
  phone: "",
  email: "",
};

const emptyPasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export function CustomerPortalPage({ currentPath, onNavigate }) {
  const [authMode, setAuthMode] = useState("register");
  const [customer, setCustomer] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [orders, setOrders] = useState([]);
  const [ordersStatus, setOrdersStatus] = useState("idle");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [profileStatus, setProfileStatus] = useState("idle");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileMessageType, setProfileMessageType] = useState("success");
  const [passwordForm, setPasswordForm] = useState(emptyPasswordForm);
  const [passwordStatus, setPasswordStatus] = useState("idle");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordMessageType, setPasswordMessageType] = useState("success");
  const isSubmitting = status === "submitting";
  const isProfileSubmitting = profileStatus === "submitting";
  const isPasswordSubmitting = passwordStatus === "submitting";

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
    const emailStatus = new URLSearchParams(window.location.search).get("email");

    if (emailStatus === "verified") {
      setMessageType("success");
      setMessage("Votre email est confirmé. Vous êtes connecté à votre espace client.");
      window.history.replaceState({}, "", "/espace-client");
    }

    if (emailStatus === "invalid") {
      setAuthMode("login");
      setMessageType("error");
      setMessage("Le lien de confirmation est invalide ou expiré. Relancez votre inscription pour recevoir un nouveau lien.");
      window.history.replaceState({}, "", "/espace-client");
    }
  }, []);

  useEffect(() => {
    if (!customer) {
      setProfileForm(emptyProfileForm);
      setPasswordForm(emptyPasswordForm);
      return;
    }

    setProfileForm({
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      company: customer.company || "",
      phone: customer.phone || "",
      email: customer.email || "",
    });
    setPasswordForm(emptyPasswordForm);
  }, [customer]);

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

  function handleProfileChange(event) {
    const { name, value } = event.currentTarget;
    setProfileForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function handlePasswordChange(event) {
    const { name, value } = event.currentTarget;
    setPasswordForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
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

      if (response.ok && authMode === "register" && payload.verificationRequired) {
        form.reset();
        setCustomer(null);
        setAuthMode("login");
        setStatus("idle");
        setMessageType("success");
        setMessage(
          `Votre compte est créé. Confirmez votre email (${payload.email}) avant de vous connecter.`,
        );
        return;
      }

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

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileStatus("submitting");
    setProfileMessage("");

    try {
      const response = await fetch("/api/auth/me", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(profileForm),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.user) {
        throw new Error(payload.error || "Impossible de modifier vos informations.");
      }

      setCustomer(payload.user);
      setProfileStatus("idle");
      setProfileMessageType("success");
      setProfileMessage("Vos informations ont été enregistrées.");
    } catch (error) {
      setProfileStatus("idle");
      setProfileMessageType("error");
      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier vos informations pour le moment.",
      );
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessageType("error");
      setPasswordMessage("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    setPasswordStatus("submitting");

    try {
      const response = await fetch("/api/auth/password", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passwordForm),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Impossible de modifier votre mot de passe.");
      }

      setPasswordForm(emptyPasswordForm);
      setPasswordStatus("idle");
      setPasswordMessageType("success");
      setPasswordMessage("Votre mot de passe a été modifié.");
    } catch (error) {
      setPasswordStatus("idle");
      setPasswordMessageType("error");
      setPasswordMessage(
        error instanceof Error
          ? error.message
          : "Impossible de modifier votre mot de passe pour le moment.",
      );
    }
  }

  return (
    <section className="section customer-section">
        <div className={`container customer-shell${customer ? " customer-shell--dashboard" : ""}`}>
          {!customer && (
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
          )}

          {customer ? (
            <div className="customer-dashboard" aria-live="polite">
              <div className="customer-dashboard-head">
                <div className="customer-dashboard-copy">
                  <div className="customer-identity">
                    <div className="customer-avatar" aria-hidden="true">
                      {getCustomerInitials(customer)}
                    </div>
                    <div>
                      <span className="customer-status">Connecté</span>
                      <h2>Bonjour {customer.firstName}</h2>
                      <p>{customer.email}</p>
                    </div>
                  </div>
                  <div className="customer-session-points" aria-label="Services de l'espace client">
                    <span>
                      <ShieldCheck size={17} />
                      Session sécurisée
                    </span>
                    <span>
                      <ClipboardList size={17} />
                      Demandes centralisées
                    </span>
                    <span>
                      <Building2 size={17} />
                      Profil entreprise
                    </span>
                  </div>
                </div>
                <button className="button button-dark" type="button" onClick={handleLogout}>
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
              <div className="customer-dashboard-grid">
                <article className="customer-profile-card">
                  <div className="customer-card-title">
                    <UserRound size={26} />
                    <h3>Profil client</h3>
                  </div>
                  <dl className="customer-profile-list">
                    <div>
                      <dt>Nom</dt>
                      <dd>
                        {customer.firstName} {customer.lastName}
                      </dd>
                    </div>
                    {customer.company && (
                      <div>
                        <dt>Société</dt>
                        <dd>{customer.company}</dd>
                      </div>
                    )}
                    <div>
                      <dt>Compte créé</dt>
                      <dd>{formatCustomerDate(customer.createdAt)}</dd>
                    </div>
                  </dl>
                </article>
                <article className="customer-action-card">
                  <div className="customer-card-title">
                    <ClipboardList size={26} />
                    <h3>Demandes de devis</h3>
                  </div>
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
                <article className="customer-action-card">
                  <div className="customer-card-title">
                    <ShoppingCart size={26} />
                    <h3>Commandes</h3>
                  </div>
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
              <CustomerAccountSettings
                profileForm={profileForm}
                profileMessage={profileMessage}
                profileMessageType={profileMessageType}
                isProfileSubmitting={isProfileSubmitting}
                passwordForm={passwordForm}
                passwordMessage={passwordMessage}
                passwordMessageType={passwordMessageType}
                isPasswordSubmitting={isPasswordSubmitting}
                onProfileChange={handleProfileChange}
                onProfileSubmit={handleProfileSubmit}
                onPasswordChange={handlePasswordChange}
                onPasswordSubmit={handlePasswordSubmit}
              />
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
                  <div className="customer-field">
                    <label htmlFor="customer-password">Mot de passe</label>
                    <div className="customer-password-field">
                      <input
                        id="customer-password"
                        name="password"
                        type={isPasswordVisible ? "text" : "password"}
                        required
                        minLength={8}
                        autoComplete={authMode === "register" ? "new-password" : "current-password"}
                      />
                      <button
                        className="customer-password-toggle"
                        type="button"
                        aria-label={
                          isPasswordVisible
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                        aria-pressed={isPasswordVisible}
                        onClick={() => setIsPasswordVisible((visible) => !visible)}
                      >
                        {isPasswordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>
                  <p className="auth-note">Mot de passe de 8 caractères minimum.</p>
                  {authMode === "register" && (
                    <p className="auth-note">
                      Un lien de confirmation sera envoyé à cette adresse email.
                    </p>
                  )}
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
  );
}

function CustomerAccountSettings({
  profileForm,
  profileMessage,
  profileMessageType,
  isProfileSubmitting,
  passwordForm,
  passwordMessage,
  passwordMessageType,
  isPasswordSubmitting,
  onProfileChange,
  onProfileSubmit,
  onPasswordChange,
  onPasswordSubmit,
}) {
  return (
    <section className="customer-account-panel" aria-labelledby="customer-account-title">
      <div className="customer-account-head">
        <div>
          <h3 id="customer-account-title">Mes informations personnelles</h3>
          <p>Modifiez vos coordonnées de contact et votre mot de passe de connexion.</p>
        </div>
      </div>

      <div className="customer-account-forms">
        <form className="customer-account-form" onSubmit={onProfileSubmit}>
          <div className="customer-form-title">
            <UserRound size={22} />
            <h4>Coordonnées</h4>
          </div>
          <div className="field-row">
            <label>
              Prénom
              <input
                name="firstName"
                value={profileForm.firstName}
                required
                autoComplete="given-name"
                onChange={onProfileChange}
              />
            </label>
            <label>
              Nom
              <input
                name="lastName"
                value={profileForm.lastName}
                required
                autoComplete="family-name"
                onChange={onProfileChange}
              />
            </label>
          </div>
          <div className="field-row">
            <label>
              Société
              <input
                name="company"
                value={profileForm.company}
                autoComplete="organization"
                onChange={onProfileChange}
              />
            </label>
            <label>
              Téléphone
              <input
                name="phone"
                value={profileForm.phone}
                autoComplete="tel"
                onChange={onProfileChange}
              />
            </label>
          </div>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={profileForm.email}
              required
              autoComplete="email"
              onChange={onProfileChange}
            />
          </label>
          <button className="button button-primary" type="submit" disabled={isProfileSubmitting}>
            <Save size={18} />
            {isProfileSubmitting ? "Enregistrement..." : "Enregistrer mes informations"}
          </button>
          {profileMessage && (
            <p
              className={profileMessageType === "error" ? "form-error" : "form-success"}
              role={profileMessageType === "error" ? "alert" : "status"}
            >
              {profileMessage}
            </p>
          )}
        </form>

        <form className="customer-account-form" onSubmit={onPasswordSubmit}>
          <div className="customer-form-title">
            <KeyRound size={22} />
            <h4>Mot de passe</h4>
          </div>
          <label>
            Mot de passe actuel
            <input
              name="currentPassword"
              type="password"
              value={passwordForm.currentPassword}
              required
              autoComplete="current-password"
              onChange={onPasswordChange}
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              name="newPassword"
              type="password"
              value={passwordForm.newPassword}
              required
              minLength={8}
              autoComplete="new-password"
              onChange={onPasswordChange}
            />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input
              name="confirmPassword"
              type="password"
              value={passwordForm.confirmPassword}
              required
              minLength={8}
              autoComplete="new-password"
              onChange={onPasswordChange}
            />
          </label>
          <p className="auth-note">Utilisez au moins 8 caractères.</p>
          <button className="button button-dark" type="submit" disabled={isPasswordSubmitting}>
            <KeyRound size={18} />
            {isPasswordSubmitting ? "Modification..." : "Modifier le mot de passe"}
          </button>
          {passwordMessage && (
            <p
              className={passwordMessageType === "error" ? "form-error" : "form-success"}
              role={passwordMessageType === "error" ? "alert" : "status"}
            >
              {passwordMessage}
            </p>
          )}
        </form>
      </div>
    </section>
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
              {(order.invoicePdfUrl || order.invoiceUrl) && (
                <a
                  className="customer-invoice-link"
                  href={order.invoicePdfUrl || order.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileText size={16} />
                  Télécharger la facture
                </a>
              )}
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

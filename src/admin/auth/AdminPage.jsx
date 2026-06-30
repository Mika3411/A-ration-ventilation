import { useEffect, useState } from "react";
import { LogIn } from "lucide-react";

import { AdminDashboard } from "../dashboard/AdminDashboard.jsx";
import { fetchAdminSession, loginAdmin, logoutAdmin } from "./adminAuthApi.js";

export function AdminPage({ onProductsChanged }) {
  const [admin, setAdmin] = useState(null);
  const [authStatus, setAuthStatus] = useState("checking");
  const [authMessage, setAuthMessage] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "" });

  useEffect(() => {
    let alive = true;

    async function loadAdminSession() {
      try {
        const payload = await fetchAdminSession();

        if (!alive) return;

        setAdmin(payload.admin || null);
        setAuthMessage(payload.error || "");
        setAuthStatus(payload.admin ? "authenticated" : "anonymous");
      } catch {
        if (!alive) return;
        setAuthMessage("Impossible de vérifier la session admin.");
        setAuthStatus("anonymous");
      }
    }

    loadAdminSession();
    return () => {
      alive = false;
    };
  }, []);

  async function handleLogin(event) {
    event.preventDefault();
    setAuthStatus("loading");
    setAuthMessage("");

    try {
      const payload = await loginAdmin(loginForm);

      setAdmin(payload.admin);
      setLoginForm((form) => ({ ...form, password: "" }));
      setAuthStatus("authenticated");
    } catch (error) {
      setAdmin(null);
      setAuthStatus("anonymous");
      setAuthMessage(error instanceof Error ? error.message : "Connexion impossible.");
    }
  }

  async function handleLogout() {
    await logoutAdmin();
    setAdmin(null);
    setAuthStatus("anonymous");
  }

  return (
    <>
      <section className="section admin-section">
        <div className="container">
          {authStatus === "checking" && (
            <div className="admin-empty-state">Vérification de la session admin...</div>
          )}
          {authStatus !== "checking" && !admin && (
            <form className="admin-login-panel" onSubmit={handleLogin}>
              <div>
                <LogIn size={34} />
                <h2>Connexion admin</h2>
              </div>
              <label>
                Identifiant
                <input
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((form) => ({ ...form, username: event.target.value }))
                  }
                  autoComplete="username"
                />
              </label>
              <label>
                Mot de passe
                <input
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((form) => ({ ...form, password: event.target.value }))
                  }
                  type="password"
                  autoComplete="current-password"
                />
              </label>
              <button className="button button-primary" type="submit" disabled={authStatus === "loading"}>
                <LogIn size={18} />
                {authStatus === "loading" ? "Connexion..." : "Se connecter"}
              </button>
              {authMessage && (
                <p className="form-error" role="alert">
                  {authMessage}
                </p>
              )}
            </form>
          )}
          {admin && (
            <AdminDashboard
              admin={admin}
              onLogout={handleLogout}
              onProductsChanged={onProductsChanged}
            />
          )}
        </div>
      </section>
    </>
  );
}

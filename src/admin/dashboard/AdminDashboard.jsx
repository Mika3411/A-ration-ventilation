import { useState } from "react";
import { BadgePercent, LogOut, PackagePlus, Users } from "lucide-react";

import { AdminMembersManager } from "../members/AdminMembersManager.jsx";
import { AdminProductsManager } from "../products/AdminProductsManager.jsx";
import { AdminPromoCodesManager } from "../promoCodes/AdminPromoCodesManager.jsx";

export function AdminDashboard({ admin, onLogout, onProductsChanged }) {
  const [activeView, setActiveView] = useState("products");

  return (
    <div className="admin-layout">
      <div className="admin-toolbar">
        <div>
          <span>Connecté</span>
          <strong>{admin.username}</strong>
        </div>
        <div className="admin-toolbar-actions">
          <div className="admin-view-tabs" aria-label="Sections d'administration">
            <button
              className={activeView === "products" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("products")}
            >
              <PackagePlus size={18} />
              Produits
            </button>
            <button
              className={activeView === "members" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("members")}
            >
              <Users size={18} />
              Membres
            </button>
            <button
              className={activeView === "promo-codes" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveView("promo-codes")}
            >
              <BadgePercent size={18} />
              Codes promo
            </button>
          </div>
          <button className="button button-dark" type="button" onClick={onLogout}>
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </div>
      {activeView === "products" ? (
        <AdminProductsManager onProductsChanged={onProductsChanged} />
      ) : activeView === "members" ? (
        <AdminMembersManager />
      ) : (
        <AdminPromoCodesManager />
      )}
    </div>
  );
}

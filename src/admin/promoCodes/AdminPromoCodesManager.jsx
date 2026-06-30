import { useEffect, useMemo, useState } from "react";
import { BadgePercent, Save, Search, Trash2 } from "lucide-react";

import { AdminFieldLabel, AdminHelpTooltip } from "../components/AdminFieldLabel.jsx";
import { formatAdminPercent } from "../utils/format.js";
import { normalizeAdminSearchValue } from "../utils/search.js";
import { deleteAdminPromoCode, fetchAdminPromoCodes, saveAdminPromoCode } from "./promoCodesApi.js";
import { emptyAdminPromoCodeForm, getAdminPromoCodeForm, getAdminPromoCodePayload } from "./promoCodeForm.js";

export function AdminPromoCodesManager() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [form, setForm] = useState(emptyAdminPromoCodeForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const selectedPromoCode =
    promoCodes.find((promoCode) => promoCode.code === selectedCode) || null;
  const isSaving = status === "saving";

  const filteredPromoCodes = useMemo(() => {
    const normalizedQuery = normalizeAdminSearchValue(query.trim());
    if (!normalizedQuery) return promoCodes;

    return promoCodes.filter((promoCode) =>
      normalizeAdminSearchValue(
        [
          promoCode.code,
          `${promoCode.percent}%`,
          promoCode.active ? "actif" : "inactif",
          promoCode.minimumAmountLabel,
        ]
          .filter(Boolean)
          .join(" "),
      ).includes(normalizedQuery),
    );
  }, [promoCodes, query]);

  useEffect(() => {
    loadPromoCodes();
  }, []);

  async function loadPromoCodes(nextSelectedCode = selectedCode) {
    setStatus("loading");
    setMessage("");

    try {
      const payload = await fetchAdminPromoCodes();

      const loadedPromoCodes = Array.isArray(payload.promoCodes) ? payload.promoCodes : [];
      const nextPromoCode =
        loadedPromoCodes.find((promoCode) => promoCode.code === nextSelectedCode) ||
        loadedPromoCodes[0] ||
        null;

      setPromoCodes(loadedPromoCodes);
      setSelectedCode(nextPromoCode?.code || "");
      setForm(getAdminPromoCodeForm(nextPromoCode));
      setStatus("ready");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Impossible de charger les codes promo.");
    }
  }

  function selectPromoCode(promoCode) {
    setSelectedCode(promoCode.code);
    setForm(getAdminPromoCodeForm(promoCode));
    setMessage("");
  }

  function createNewPromoCode() {
    setSelectedCode("");
    setForm(emptyAdminPromoCodeForm);
    setMessage("");
  }

  function updatePromoForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function savePromoCode(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const payload = await saveAdminPromoCode(selectedCode, getAdminPromoCodePayload(form));

      setStatus("ready");
      await loadPromoCodes(payload.promoCode?.code);
      setMessage("Code promo enregistré.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer le code promo.");
    }
  }

  async function deleteSelectedPromoCode() {
    if (!selectedPromoCode) return;

    const confirmed = window.confirm(`Supprimer le code promo ${selectedPromoCode.code} ?`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    try {
      await deleteAdminPromoCode(selectedPromoCode.code);

      setStatus("ready");
      await loadPromoCodes("");
      setMessage("Code promo supprimé.");
    } catch (error) {
      setStatus("ready");
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer le code promo.");
    }
  }

  return (
    <section className="admin-promo-panel" aria-label="Gestion des codes promo">
      <div className="admin-members-head admin-promo-head">
        <div>
          <span>Réductions</span>
          <h2>Codes promo</h2>
        </div>
        <label className="admin-member-search">
          <Search size={18} />
          <span className="sr-only">Rechercher un code promo</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un code..."
          />
        </label>
      </div>

      {message && (
        <p
          className={
            message.includes("Impossible") ||
            message.includes("obligatoire") ||
            message.includes("valable") ||
            message.includes("invalide") ||
            message.includes("existe déjà")
              ? "form-error"
              : "form-success"
          }
        >
          {message}
        </p>
      )}

      <div className="admin-promo-shell">
        <aside className="admin-promo-list" aria-label="Codes promo enregistrés">
          <div className="admin-product-list-head">
            <h2>Codes</h2>
            <button type="button" onClick={createNewPromoCode} aria-label="Ajouter un code promo">
              <BadgePercent size={20} />
            </button>
          </div>
          {status === "loading" && <p className="admin-empty-state">Chargement des codes promo...</p>}
          {status === "error" && !promoCodes.length && (
            <p className="admin-empty-state">Impossible de charger les codes promo.</p>
          )}
          {status !== "loading" && !promoCodes.length && (
            <p className="admin-empty-state">Aucun code promo créé pour le moment.</p>
          )}
          {status !== "loading" &&
            filteredPromoCodes.map((promoCode) => (
              <button
                className={selectedCode === promoCode.code ? "is-selected" : ""}
                type="button"
                key={promoCode.code}
                onClick={() => selectPromoCode(promoCode)}
              >
                <span>
                  <strong>{promoCode.code}</strong>
                  <small>
                    -{formatAdminPercent(promoCode.percent)}
                    {promoCode.minimumAmount > 0
                      ? ` dès ${promoCode.minimumAmountLabel}`
                      : " sans minimum"}
                  </small>
                </span>
                <em>{promoCode.active ? "Actif" : "Inactif"}</em>
              </button>
            ))}
          {status !== "loading" && promoCodes.length > 0 && filteredPromoCodes.length === 0 && (
            <p className="admin-empty-state">Aucun code promo ne correspond à cette recherche.</p>
          )}
        </aside>

        <form className="admin-promo-form" onSubmit={savePromoCode}>
          <div className="admin-form-head">
            <div>
              <span>{selectedCode || "nouveau-code"}</span>
              <h2>{selectedCode ? "Modifier le code promo" : "Créer un code promo"}</h2>
            </div>
            <div className="admin-form-actions">
              {selectedPromoCode && (
                <button
                  className="button button-dark"
                  type="button"
                  onClick={deleteSelectedPromoCode}
                  disabled={isSaving}
                >
                  <Trash2 size={18} />
                  Supprimer
                </button>
              )}
              <button className="button button-primary" type="submit" disabled={isSaving}>
                <Save size={18} />
                {isSaving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>

          <div className="admin-form-grid">
            <label>
              <AdminFieldLabel
                label="Code"
                help="Code saisi par le client dans le panier. Lettres, chiffres, tiret ou underscore."
              />
              <input
                value={form.code}
                onChange={(event) => updatePromoForm("code", event.target.value.toUpperCase())}
                placeholder="PRO10"
                required
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Remise %"
                help="Pourcentage appliqué au panier après les remises quantité."
              />
              <input
                value={form.percent}
                onChange={(event) => updatePromoForm("percent", event.target.value)}
                inputMode="decimal"
                placeholder="10"
                required
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Minimum EUR"
                help="Montant minimum du panier avant le code promo. Laissez vide pour aucun minimum."
              />
              <input
                value={form.minimumAmount}
                onChange={(event) => updatePromoForm("minimumAmount", event.target.value)}
                inputMode="decimal"
                placeholder="100"
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Début"
                help="Optionnel. Le code ne sera utilisable qu'à partir de cette date."
              />
              <input
                value={form.startsAt}
                onChange={(event) => updatePromoForm("startsAt", event.target.value)}
                type="datetime-local"
              />
            </label>
            <label>
              <AdminFieldLabel
                label="Fin"
                help="Optionnel. Après cette date, le code sera refusé automatiquement."
              />
              <input
                value={form.endsAt}
                onChange={(event) => updatePromoForm("endsAt", event.target.value)}
                type="datetime-local"
              />
            </label>
            <div className="admin-toggle-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => updatePromoForm("active", event.target.checked)}
                />
                <span>Code actif</span>
                <AdminHelpTooltip text="Décoche pour garder le code en admin sans permettre son utilisation." />
              </label>
            </div>
          </div>

          <div className="admin-promo-preview">
            <BadgePercent size={22} />
            <div>
              <span>Aperçu</span>
              <strong>
                {form.code || "CODE"} -{formatAdminPercent(form.percent) || "..."}
              </strong>
              <p>
                {form.minimumAmount
                  ? `Valable à partir de ${form.minimumAmount} € de panier.`
                  : "Valable sans minimum de panier."}
              </p>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}

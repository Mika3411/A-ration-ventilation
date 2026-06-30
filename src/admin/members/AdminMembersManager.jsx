import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarClock,
  FileText,
  Mail,
  Phone,
  Save,
  Search,
  ShoppingBag,
  UserRound,
} from "lucide-react";

import { formatAdminDate } from "../utils/format.js";
import { emptyAdminMemberForm, getAdminMemberForm, getAdminMemberPayload } from "./memberForm.js";
import { fetchAdminMemberDetail, fetchAdminMembers, updateAdminMember } from "./membersApi.js";

export function AdminMembersManager() {
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [memberDetail, setMemberDetail] = useState(null);
  const [memberForm, setMemberForm] = useState(emptyAdminMemberForm);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("loading");
  const [detailStatus, setDetailStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const selectedMember =
    memberDetail || members.find((member) => member.id === selectedMemberId) || null;
  const isSaving = detailStatus === "saving";

  const filteredMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return members;

    return members.filter((member) =>
      [
        member.fullName,
        member.email,
        member.company,
        member.phone,
        member.totalSpentLabel,
        String(member.orderCount),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [members, query]);

  useEffect(() => {
    let alive = true;

    async function loadMembers() {
      setStatus("loading");
      setMessage("");

      try {
        const payload = await fetchAdminMembers();

        if (!alive) return;

        const loadedMembers = Array.isArray(payload.members) ? payload.members : [];
        setMembers(loadedMembers);
        setSelectedMemberId((currentId) => currentId || loadedMembers[0]?.id || "");
        setStatus("ready");
      } catch (error) {
        if (!alive) return;
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Impossible de charger les membres.");
      }
    }

    loadMembers();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedMemberId) {
      setMemberDetail(null);
      setMemberForm(emptyAdminMemberForm);
      return undefined;
    }

    let alive = true;

    async function loadMemberDetail() {
      setDetailStatus("loading");
      setMessage("");

      try {
        const payload = await fetchAdminMemberDetail(selectedMemberId);

        if (!alive) return;

        setMemberDetail(payload.member);
        setMemberForm(getAdminMemberForm(payload.member));
        setDetailStatus("idle");
      } catch (error) {
        if (!alive) return;
        setMemberDetail(null);
        setDetailStatus("error");
        setMessage(error instanceof Error ? error.message : "Impossible de charger le membre.");
      }
    }

    loadMemberDetail();
    return () => {
      alive = false;
    };
  }, [selectedMemberId]);

  function selectMember(member) {
    setSelectedMemberId(member.id);
    setMessage("");
  }

  function updateMemberForm(field, value) {
    setMemberForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveMember(event) {
    event.preventDefault();
    if (!selectedMemberId) return;

    setDetailStatus("saving");
    setMessage("");

    try {
      const payload = await updateAdminMember(selectedMemberId, getAdminMemberPayload(memberForm));

      setMemberDetail(payload.member);
      setMemberForm(getAdminMemberForm(payload.member));
      setMembers((currentMembers) =>
        currentMembers.map((member) =>
          member.id === payload.member.id
            ? {
                ...member,
                ...payload.member,
                orders: undefined,
              }
            : member,
        ),
      );
      setDetailStatus("idle");
      setMessage("Membre enregistré.");
    } catch (error) {
      setDetailStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de modifier le membre.");
    }
  }

  return (
    <section className="admin-members-panel" aria-label="Gestion des membres">
      <div className="admin-members-head">
        <div>
          <span>Clients</span>
          <h2>Membres</h2>
        </div>
        <label className="admin-member-search">
          <Search size={18} />
          <span className="sr-only">Rechercher un membre</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un membre..."
          />
        </label>
      </div>

      {message && (
        <p
          className={
            message.includes("Impossible") ||
            message.includes("obligatoire") ||
            message.includes("valide") ||
            message.includes("existe déjà")
              ? "form-error"
              : "form-success"
          }
        >
          {message}
        </p>
      )}

      <div className="admin-members-shell">
        <aside className="admin-member-list" aria-label="Membres enregistrés">
          {status === "loading" && <p className="admin-empty-state">Chargement des membres...</p>}
          {status === "error" && !members.length && (
            <p className="admin-empty-state">
              Impossible de charger les membres. Vérifiez que la base Render Postgres est configurée.
            </p>
          )}
          {status !== "loading" && status !== "error" && !members.length && (
            <p className="admin-empty-state">Aucun membre inscrit pour le moment.</p>
          )}
          {status !== "loading" &&
            filteredMembers.map((member) => (
              <button
                className={selectedMemberId === member.id ? "is-selected" : ""}
                type="button"
                key={member.id}
                onClick={() => selectMember(member)}
              >
                <span className="admin-member-avatar" aria-hidden="true">
                  {(member.firstName || member.email || "?").charAt(0).toUpperCase()}
                </span>
                <span>
                  <strong>{member.fullName || member.email}</strong>
                  <small>{member.email}</small>
                </span>
                <em>
                  {member.orderCount} commande{member.orderCount > 1 ? "s" : ""}
                </em>
              </button>
            ))}
          {status !== "loading" && members.length > 0 && filteredMembers.length === 0 && (
            <p className="admin-empty-state">Aucun membre ne correspond à cette recherche.</p>
          )}
        </aside>

        <div className="admin-member-detail">
          {!selectedMember && detailStatus !== "loading" && (
            <p className="admin-empty-state">Sélectionnez un membre pour voir ses informations.</p>
          )}
          {detailStatus === "loading" && (
            <p className="admin-empty-state">Chargement des informations du membre...</p>
          )}
          {selectedMember && detailStatus !== "loading" && (
            <>
              <div className="admin-member-summary">
                <span className="admin-member-avatar admin-member-avatar-large" aria-hidden="true">
                  {(selectedMember.firstName || selectedMember.email || "?").charAt(0).toUpperCase()}
                </span>
                <div>
                  <span>Membre</span>
                  <h2>{selectedMember.fullName || selectedMember.email}</h2>
                  <p>{selectedMember.email}</p>
                </div>
              </div>

              <div className="admin-member-stats">
                <article>
                  <ShoppingBag size={22} />
                  <span>Commandes</span>
                  <strong>{selectedMember.orderCount}</strong>
                </article>
                <article>
                  <UserRound size={22} />
                  <span>Total dépensé</span>
                  <strong>{selectedMember.totalSpentLabel}</strong>
                </article>
                <article>
                  <CalendarClock size={22} />
                  <span>Dernière commande</span>
                  <strong>{formatAdminDate(selectedMember.lastOrderAt)}</strong>
                </article>
                <article>
                  <CalendarClock size={22} />
                  <span>Inscription</span>
                  <strong>{formatAdminDate(selectedMember.createdAt)}</strong>
                </article>
              </div>

              <form className="admin-member-form" onSubmit={saveMember}>
                <div className="admin-form-head">
                  <div>
                    <span>{selectedMember.id}</span>
                    <h2>Informations membre</h2>
                  </div>
                  <button className="button button-primary" type="submit" disabled={isSaving}>
                    <Save size={18} />
                    {isSaving ? "Enregistrement..." : "Enregistrer"}
                  </button>
                </div>
                <div className="admin-form-grid">
                  <label>
                    Prénom
                    <input
                      value={memberForm.firstName}
                      onChange={(event) => updateMemberForm("firstName", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Nom
                    <input
                      value={memberForm.lastName}
                      onChange={(event) => updateMemberForm("lastName", event.target.value)}
                      required
                    />
                  </label>
                  <label>
                    Email
                    <span className="admin-input-with-icon">
                      <Mail size={18} />
                      <input
                        value={memberForm.email}
                        onChange={(event) => updateMemberForm("email", event.target.value)}
                        type="email"
                        required
                      />
                    </span>
                  </label>
                  <label>
                    Téléphone
                    <span className="admin-input-with-icon">
                      <Phone size={18} />
                      <input
                        value={memberForm.phone}
                        onChange={(event) => updateMemberForm("phone", event.target.value)}
                      />
                    </span>
                  </label>
                  <label className="admin-wide-field">
                    Entreprise
                    <span className="admin-input-with-icon">
                      <Building2 size={18} />
                      <input
                        value={memberForm.company}
                        onChange={(event) => updateMemberForm("company", event.target.value)}
                      />
                    </span>
                  </label>
                </div>
              </form>

              <section className="admin-member-orders" aria-label="Commandes du membre">
                <div className="admin-category-head">
                  <div>
                    <span>Historique</span>
                    <h2>Commandes</h2>
                  </div>
                </div>
                {Array.isArray(memberDetail?.orders) && memberDetail.orders.length > 0 ? (
                  <ul>
                    {memberDetail.orders.map((order) => (
                      <li key={order.id}>
                        <div>
                          <strong>{order.total}</strong>
                          <span>{formatAdminDate(order.createdAt)}</span>
                        </div>
                        <div>
                          <span>{order.status || "Statut inconnu"}</span>
                          <small>
                            {order.items.length} article{order.items.length > 1 ? "s" : ""}
                          </small>
                          {(order.invoicePdfUrl || order.invoiceUrl) && (
                            <a
                              className="admin-invoice-link"
                              href={order.invoicePdfUrl || order.invoiceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <FileText size={14} />
                              Facture
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="admin-empty-state">Aucune commande enregistrée pour ce membre.</p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

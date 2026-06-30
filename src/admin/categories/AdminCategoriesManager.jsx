import { useState } from "react";
import { Check, Edit3, Plus, Trash2, X } from "lucide-react";

import { AdminFieldLabel } from "../components/AdminFieldLabel.jsx";

export function AdminCategoriesManager({
  categories,
  onCreateCategory,
  onDeleteCategory,
  onRenameCategory,
  products,
}) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingName, setEditingName] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const isSaving = status === "saving";
  const productCounts = products.reduce((counts, product) => {
    counts.set(product.category, (counts.get(product.category) || 0) + 1);
    return counts;
  }, new Map());

  async function handleCreateCategory(event) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setStatus("saving");
    setMessage("");

    try {
      await onCreateCategory(name);
      setNewCategoryName("");
      setStatus("idle");
      setMessage("Catégorie ajoutée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de créer la catégorie.");
    }
  }

  function startEditingCategory(category) {
    setEditingCategory(category);
    setEditingName(category);
    setMessage("");
  }

  function cancelEditingCategory() {
    setEditingCategory("");
    setEditingName("");
  }

  async function handleRenameCategory(event) {
    event.preventDefault();
    const name = editingName.trim();
    if (!editingCategory || !name) return;

    setStatus("saving");
    setMessage("");

    try {
      await onRenameCategory(editingCategory, name);
      setEditingCategory("");
      setEditingName("");
      setStatus("idle");
      setMessage("Catégorie renommée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de renommer la catégorie.");
    }
  }

  async function handleDeleteCategory(category) {
    const confirmed = window.confirm(`Supprimer la catégorie ${category} ?`);
    if (!confirmed) return;

    setStatus("saving");
    setMessage("");

    try {
      await onDeleteCategory(category);
      setStatus("idle");
      setMessage("Catégorie supprimée.");
    } catch (error) {
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : "Impossible de supprimer la catégorie.");
    }
  }

  return (
    <section className="admin-category-manager" aria-label="Catégories administrables">
      <div className="admin-category-head">
        <div>
          <span>Boutique</span>
          <h2>Catégories</h2>
        </div>
      </div>
      <form className="admin-category-form" onSubmit={handleCreateCategory}>
        <label>
          <AdminFieldLabel
            label="Nouvelle catégorie"
            help="Ajoute une catégorie qui pourra ensuite être utilisée sur les fiches produits."
          />
          <span>
            <input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Nom de catégorie"
              disabled={isSaving}
            />
            <button type="submit" aria-label="Ajouter la catégorie" disabled={isSaving}>
              <Plus size={18} />
            </button>
          </span>
        </label>
      </form>
      <ul className="admin-category-list">
        {categories.map((category) => {
          const productCount = productCounts.get(category) || 0;
          const isEditing = editingCategory === category;

          return (
            <li key={category}>
              {isEditing ? (
                <form className="admin-category-edit" onSubmit={handleRenameCategory}>
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    disabled={isSaving}
                    autoFocus
                  />
                  <button type="submit" aria-label="Valider le renommage" disabled={isSaving}>
                    <Check size={16} />
                  </button>
                  <button
                    type="button"
                    aria-label="Annuler le renommage"
                    onClick={cancelEditingCategory}
                    disabled={isSaving}
                  >
                    <X size={16} />
                  </button>
                </form>
              ) : (
                <>
                  <span>
                    <strong>{category}</strong>
                    <small>
                      {productCount} produit{productCount > 1 ? "s" : ""}
                    </small>
                  </span>
                  <div className="admin-category-actions">
                    <button
                      type="button"
                      onClick={() => startEditingCategory(category)}
                      aria-label={`Renommer ${category}`}
                      disabled={isSaving}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(category)}
                      aria-label={`Supprimer ${category}`}
                      disabled={isSaving}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {message && (
        <p className={isCategoryErrorMessage(message) ? "form-error" : "form-success"} role="status">
          {message}
        </p>
      )}
    </section>
  );
}

function isCategoryErrorMessage(message) {
  return (
    message.includes("Impossible") ||
    message.includes("obligatoire") ||
    message.includes("existe déjà") ||
    message.includes("introuvable")
  );
}

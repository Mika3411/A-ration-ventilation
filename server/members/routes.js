import express from "express";

import { requireAdmin } from "../auth/adminAuth.js";
import { cleanSingleLine } from "../helpers.js";
import {
  getAdminMember,
  getAdminMembers,
  handleMemberMutationError,
  updateAdminMember,
} from "./service.js";

export function createAdminMembersRouter() {
  const router = express.Router();

  router.get("/members", requireAdmin, async (_request, response) => {
    try {
      const members = await getAdminMembers();
      response.status(200).json({ members });
    } catch (error) {
      handleMemberMutationError(error, response, "Impossible de charger les membres.");
    }
  });

  router.get("/members/:id", requireAdmin, async (request, response) => {
    try {
      const memberId = cleanSingleLine(request.params.id, 140);
      const member = await getAdminMember(memberId);

      if (!member) {
        response.status(404).json({ error: "Membre introuvable." });
        return;
      }

      response.status(200).json({ member });
    } catch (error) {
      handleMemberMutationError(error, response, "Impossible de charger le membre.");
    }
  });

  router.put("/members/:id", requireAdmin, async (request, response) => {
    try {
      const memberId = cleanSingleLine(request.params.id, 140);
      const member = await updateAdminMember(memberId, request.body);

      if (!member) {
        response.status(404).json({ error: "Membre introuvable." });
        return;
      }

      response.status(200).json({ member });
    } catch (error) {
      handleMemberMutationError(error, response, "Impossible de modifier le membre.");
    }
  });

  return router;
}

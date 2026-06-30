import express from "express";

import { getMailFromAddress, getMailTransport, getMissingMailConfig } from "../email/mailer.js";
import { cleanMessage, cleanSingleLine, escapeHtml } from "../helpers.js";
import { contactRateLimiter } from "../security/rateLimit.js";

export function createContactRouter() {
  const router = express.Router();

  router.post("/contact", contactRateLimiter, async (request, response) => {
    const website = cleanSingleLine(request.body?.website, 200);
    const name = cleanSingleLine(request.body?.name, 120);
    const phone = cleanSingleLine(request.body?.phone, 80);
    const need = cleanSingleLine(request.body?.need, 160);
    const message = cleanMessage(request.body?.message, 2000);

    if (website) {
      response.status(200).json({ ok: true });
      return;
    }

    if (!name || !phone || !need) {
      response.status(400).json({ error: "Merci de compléter les champs obligatoires." });
      return;
    }

    const missingConfig = getMissingMailConfig();

    if (missingConfig.length > 0) {
      console.error(`Email configuration missing: ${missingConfig.join(", ")}`);
      response.status(503).json({
        error: "L'envoi email n'est pas encore configuré sur Render.",
      });
      return;
    }

    try {
      const to = process.env.CONTACT_TO || "contact@aeration-ventilation.fr";
      const from = getMailFromAddress();

      await getMailTransport().sendMail({
        from,
        to,
        subject: `Nouvelle demande de devis - ${need}`,
        text: buildPlainTextEmail({ name, phone, need, message }),
        html: buildHtmlEmail({ name, phone, need, message }),
      });

      response.status(200).json({ ok: true });
    } catch (error) {
      console.error("Contact email failed:", error);
      response.status(502).json({
        error: "Impossible d'envoyer la demande pour le moment.",
      });
    }
  });

  return router;
}

function buildPlainTextEmail({ name, phone, need, message }) {
  return [
    "Nouvelle demande de devis",
    "",
    `Nom: ${name}`,
    `Téléphone: ${phone}`,
    `Besoin: ${need}`,
    "",
    "Message:",
    message || "Non renseigné",
  ].join("\n");
}

function buildHtmlEmail({ name, phone, need, message }) {
  return `
    <h2>Nouvelle demande de devis</h2>
    <p><strong>Nom :</strong> ${escapeHtml(name)}</p>
    <p><strong>Téléphone :</strong> ${escapeHtml(phone)}</p>
    <p><strong>Besoin :</strong> ${escapeHtml(need)}</p>
    <p><strong>Message :</strong></p>
    <p>${escapeHtml(message || "Non renseigné").replace(/\n/g, "<br>")}</p>
  `;
}

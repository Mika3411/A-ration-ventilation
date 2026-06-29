import { dbPool, ensureDatabaseReady } from "../database.js";
import { cleanSingleLine, formatEuroAmount, isValidEmail, normalizeEmail } from "../helpers.js";

export class MemberInputError extends Error {}

export class MembersUnavailableError extends Error {}

export async function getAdminMembers() {
  await ensureMembersDatabase();

  const result = await dbPool.query(`
    SELECT
      account.public_id,
      account.first_name,
      account.last_name,
      account.company,
      account.phone,
      account.email,
      account.created_at,
      account.updated_at,
      COUNT(order_row.id)::int AS order_count,
      COALESCE(SUM(order_row.amount_total), 0)::int AS total_spent,
      MAX(order_row.created_at) AS last_order_at
    FROM customer_accounts account
    LEFT JOIN orders order_row
      ON order_row.customer_public_id = account.public_id
    GROUP BY account.id
    ORDER BY account.created_at DESC
    LIMIT 250
  `);

  return result.rows.map(serializeMemberRow);
}

export async function getAdminMember(memberId) {
  await ensureMembersDatabase();

  const cleanMemberId = cleanSingleLine(memberId, 140);
  if (!cleanMemberId) return null;

  const memberResult = await dbPool.query(
    `
      SELECT
        account.public_id,
        account.first_name,
        account.last_name,
        account.company,
        account.phone,
        account.email,
        account.created_at,
        account.updated_at,
        COUNT(order_row.id)::int AS order_count,
        COALESCE(SUM(order_row.amount_total), 0)::int AS total_spent,
        MAX(order_row.created_at) AS last_order_at
      FROM customer_accounts account
      LEFT JOIN orders order_row
        ON order_row.customer_public_id = account.public_id
      WHERE account.public_id = $1
      GROUP BY account.id
      LIMIT 1
    `,
    [cleanMemberId],
  );

  const member = memberResult.rows[0] ? serializeMemberRow(memberResult.rows[0]) : null;
  if (!member) return null;

  const ordersResult = await dbPool.query(
    `
      SELECT *
      FROM orders
      WHERE customer_public_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `,
    [cleanMemberId],
  );

  return {
    ...member,
    orders: ordersResult.rows.map(serializeMemberOrderRow),
  };
}

export async function updateAdminMember(memberId, memberInput) {
  await ensureMembersDatabase();

  const cleanMemberId = cleanSingleLine(memberId, 140);
  if (!cleanMemberId) return null;

  const input = normalizeMemberInput(memberInput);
  const result = await dbPool.query(
    `
      UPDATE customer_accounts
      SET
        first_name = $1,
        last_name = $2,
        company = $3,
        phone = $4,
        email = $5,
        updated_at = NOW()
      WHERE public_id = $6
      RETURNING public_id, first_name, last_name, company, phone, email, created_at, updated_at
    `,
    [
      input.firstName,
      input.lastName,
      input.company,
      input.phone,
      input.email,
      cleanMemberId,
    ],
  );

  return result.rows[0] ? getAdminMember(cleanMemberId) : null;
}

export function normalizeMemberInput(body) {
  const firstName = cleanSingleLine(body?.firstName, 80);
  const lastName = cleanSingleLine(body?.lastName, 80);
  const company = cleanSingleLine(body?.company, 120);
  const phone = cleanSingleLine(body?.phone, 80);
  const email = normalizeEmail(body?.email);

  if (!firstName) {
    throw new MemberInputError("Le prénom du membre est obligatoire.");
  }

  if (!lastName) {
    throw new MemberInputError("Le nom du membre est obligatoire.");
  }

  if (!email || !isValidEmail(email)) {
    throw new MemberInputError("Merci d'indiquer une adresse email valide.");
  }

  return {
    firstName,
    lastName,
    company,
    phone,
    email,
  };
}

export function handleMemberMutationError(error, response, fallbackMessage) {
  if (error instanceof MemberInputError) {
    response.status(400).json({ error: error.message });
    return;
  }

  if (error instanceof MembersUnavailableError) {
    response.status(503).json({ error: error.message });
    return;
  }

  if (error?.code === "23505") {
    response.status(409).json({ error: "Un membre existe déjà avec cette adresse email." });
    return;
  }

  console.error(fallbackMessage, error);
  response.status(500).json({ error: fallbackMessage });
}

async function ensureMembersDatabase() {
  if (!dbPool) {
    throw new MembersUnavailableError(
      "La gestion des membres nécessite DATABASE_URL sur Render Postgres.",
    );
  }

  await ensureDatabaseReady();
}

function serializeMemberRow(row) {
  const totalSpent = Number.parseInt(row.total_spent, 10) || 0;
  const orderCount = Number.parseInt(row.order_count, 10) || 0;
  const firstName = row.first_name || "";
  const lastName = row.last_name || "";

  return {
    id: row.public_id,
    firstName,
    lastName,
    fullName: [firstName, lastName].filter(Boolean).join(" "),
    company: row.company || "",
    phone: row.phone || "",
    email: row.email || "",
    orderCount,
    totalSpent,
    totalSpentLabel: formatEuroAmount(totalSpent),
    lastOrderAt: row.last_order_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeMemberOrderRow(row) {
  const amountTotal = Number.parseInt(row.amount_total, 10) || 0;

  return {
    id: row.public_id,
    status: row.status || "",
    paymentStatus: row.payment_status || "",
    amountTotal,
    total: formatEuroAmount(amountTotal),
    customerEmail: row.customer_email || "",
    items: Array.isArray(row.cart_items) ? row.cart_items : [],
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

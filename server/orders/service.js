import crypto from "node:crypto";

import { dbPool, ensureDatabaseReady } from "../database.js";
import { cleanSingleLine, formatEuroAmount } from "../helpers.js";

export function buildOrderSnapshot(cartItems) {
  const items = cartItems.map(({ product, quantity }) => ({
    slug: product.slug,
    name: product.name,
    category: product.category,
    description: product.description,
    amount: product.amount,
    price: product.price,
    quantity,
    lineTotal: product.amount * quantity,
  }));
  const amountTotal = items.reduce((total, item) => total + item.lineTotal, 0);

  return { items, amountTotal };
}

export async function createPendingOrder({ cartItems, customer }) {
  const publicId = crypto.randomUUID();
  const { items, amountTotal } = buildOrderSnapshot(cartItems);

  if (!dbPool) {
    return {
      publicId,
      amountTotal,
      items,
      persisted: false,
    };
  }

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      INSERT INTO orders (
        public_id,
        customer_public_id,
        customer_email,
        status,
        payment_status,
        currency,
        amount_total,
        cart_items
      )
      VALUES ($1, $2, $3, 'pending', 'unpaid', 'eur', $4, $5::jsonb)
      RETURNING *
    `,
    [
      publicId,
      customer?.id || null,
      customer?.email || "",
      amountTotal,
      JSON.stringify(items),
    ],
  );

  const order = serializeOrderRow(result.rows[0]);

  return {
    ...order,
    publicId: order.id,
    persisted: true,
  };
}

export async function attachStripeSessionToOrder(orderPublicId, session) {
  if (!dbPool || !orderPublicId) return null;

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      UPDATE orders
      SET
        stripe_session_id = $1,
        stripe_payment_intent_id = $2,
        stripe_customer_id = $3,
        stripe_metadata = $4::jsonb,
        updated_at = NOW()
      WHERE public_id = $5
      RETURNING *
    `,
    [
      session.id,
      getStripeId(session.payment_intent),
      getStripeId(session.customer),
      JSON.stringify(session.metadata || {}),
      orderPublicId,
    ],
  );

  return result.rows[0] ? serializeOrderRow(result.rows[0]) : null;
}

export async function completeOrderFromCheckoutSession(session) {
  if (!dbPool) {
    return null;
  }

  await ensureDatabaseReady();

  const metadata = session.metadata || {};
  const publicId = cleanSingleLine(metadata.orderId, 140) || crypto.randomUUID();
  const metadataItems = parseMetadataItems(metadata.orderItems);
  const metadataAmount = Number.parseInt(metadata.amountTotal, 10);
  const amountTotal = Number.isInteger(session.amount_total)
    ? session.amount_total
    : Number.isInteger(metadataAmount)
      ? metadataAmount
      : 0;
  const status = session.payment_status === "paid" ? "paid" : "completed";
  const completedAt = new Date().toISOString();

  const updatedByPublicId = await dbPool.query(
    `
      UPDATE orders
      SET
        customer_email = COALESCE(NULLIF($1, ''), customer_email),
        stripe_session_id = $2,
        stripe_payment_intent_id = $3,
        stripe_customer_id = $4,
        status = $5,
        payment_status = $6,
        currency = $7,
        amount_total = $8,
        stripe_metadata = $9::jsonb,
        updated_at = NOW(),
        completed_at = COALESCE(completed_at, $10)
      WHERE public_id = $11
      RETURNING *
    `,
    [
      getSessionCustomerEmail(session, metadata),
      session.id,
      getStripeId(session.payment_intent),
      getStripeId(session.customer),
      status,
      session.payment_status || "",
      session.currency || "eur",
      amountTotal,
      JSON.stringify(metadata),
      completedAt,
      publicId,
    ],
  );

  if (updatedByPublicId.rows[0]) {
    return serializeOrderRow(updatedByPublicId.rows[0]);
  }

  const result = await dbPool.query(
    `
      INSERT INTO orders (
        public_id,
        customer_public_id,
        customer_email,
        stripe_session_id,
        stripe_payment_intent_id,
        stripe_customer_id,
        status,
        payment_status,
        currency,
        amount_total,
        cart_items,
        stripe_metadata,
        completed_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12::jsonb, $13)
      ON CONFLICT (stripe_session_id) DO UPDATE
      SET
        customer_email = COALESCE(NULLIF(EXCLUDED.customer_email, ''), orders.customer_email),
        stripe_payment_intent_id = EXCLUDED.stripe_payment_intent_id,
        stripe_customer_id = EXCLUDED.stripe_customer_id,
        status = EXCLUDED.status,
        payment_status = EXCLUDED.payment_status,
        currency = EXCLUDED.currency,
        amount_total = EXCLUDED.amount_total,
        stripe_metadata = EXCLUDED.stripe_metadata,
        updated_at = NOW(),
        completed_at = COALESCE(orders.completed_at, EXCLUDED.completed_at)
      RETURNING *
    `,
    [
      publicId,
      cleanSingleLine(metadata.customerId, 140) || null,
      getSessionCustomerEmail(session, metadata),
      session.id,
      getStripeId(session.payment_intent),
      getStripeId(session.customer),
      status,
      session.payment_status || "",
      session.currency || "eur",
      amountTotal,
      JSON.stringify(metadataItems),
      JSON.stringify(metadata),
      completedAt,
    ],
  );

  return serializeOrderRow(result.rows[0]);
}

export async function getCustomerOrders(customerPublicId) {
  if (!dbPool || !customerPublicId) return [];

  await ensureDatabaseReady();
  const result = await dbPool.query(
    `
      SELECT *
      FROM orders
      WHERE customer_public_id = $1
      ORDER BY created_at DESC
      LIMIT 25
    `,
    [customerPublicId],
  );

  return result.rows.map(serializeOrderRow);
}

export function buildStripeOrderMetadata({ order, customer }) {
  const cart = order.items.map((item) => `${item.slug}:${item.quantity}`).join(",");
  const orderItems = JSON.stringify(
    order.items.map((item) => ({
      s: item.slug,
      n: item.name,
      q: item.quantity,
      a: item.amount,
      t: item.lineTotal,
    })),
  );

  return {
    orderId: order.publicId || order.id,
    customerId: customer?.id || "",
    customerEmail: customer?.email || "",
    cart: cart.length <= 500 ? cart : "",
    amountTotal: String(order.amountTotal),
    orderItems: orderItems.length <= 500 ? orderItems : "",
  };
}

function parseMetadataItems(value) {
  if (!value || typeof value !== "string") return [];

  try {
    const items = JSON.parse(value);
    if (!Array.isArray(items)) return [];

    return items
      .map((item) => ({
        slug: cleanSingleLine(item.s || item.slug, 140),
        name: cleanSingleLine(item.n || item.name, 180),
        quantity: Number.parseInt(item.q ?? item.quantity, 10) || 0,
        amount: Number.parseInt(item.a ?? item.amount, 10) || 0,
        lineTotal: Number.parseInt(item.t ?? item.lineTotal, 10) || 0,
      }))
      .filter((item) => item.slug && item.quantity > 0);
  } catch {
    return [];
  }
}

function getSessionCustomerEmail(session, metadata) {
  return (
    cleanSingleLine(session.customer_details?.email, 180) ||
    cleanSingleLine(metadata.customerEmail, 180) ||
    ""
  );
}

function getStripeId(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.id || "";
}

function serializeOrderRow(row) {
  const amountTotal = Number.parseInt(row.amount_total, 10) || 0;

  return {
    id: row.public_id,
    customerId: row.customer_public_id || "",
    customerEmail: row.customer_email || "",
    stripeSessionId: row.stripe_session_id || "",
    status: row.status,
    paymentStatus: row.payment_status,
    currency: row.currency,
    amountTotal,
    total: formatEuroAmount(amountTotal),
    items: Array.isArray(row.cart_items) ? row.cart_items : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

const API_BASE = "https://program90.pythonanywhere.com/api";

async function req(path, { method = "GET", body, signal } = {}) {
  const r = await fetch(API_BASE + path, {
    method,
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  // 204 => no body
  if (r.status === 204) return null;

  const text = await r.text().catch(() => "");
  if (!r.ok) throw new Error(text || `HTTP ${r.status} ${method} ${path}`);

  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

// DRF results[] bo‘lsa
function asList(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.results)) return x.results;
  return [];
}

// bir nechta path sinash (xato chiqarmasdan)
async function tryPaths(paths, make) {
  let lastErr = null;
  for (const p of paths) {
    try { return await make(p); }
    catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("No endpoint matched");
}

/** ============ PUBLIC API ============ **/

export async function apiGetTables({ signal } = {}) {
  // Ehtimoliy variantlar (sizning backendga mos keladigani ishlaydi)
  const paths = ["/tables"];
  const data = await tryPaths(paths, (p) => req(p, { signal }));
  const list = asList(data);

  // UI uchun normalize: {id, number, status}
  return list.map((t, i) => ({
    id: t.id ?? t.pk ?? i + 1,
    number: t.number ?? t.table_number ?? t.table ?? t.id ?? (i + 1),
    status: t.status ?? t.state ?? (t.is_busy ? "Band" : "Bo‘sh"),
    active_order_id: t.active_order_id ?? t.activeOrderId ?? null,
  }));
}

export async function apiGetOrCreateOrderByTable(tableNumber, { signal } = {}) {
  // 1) agar backendda "cashier/orders?table_number=" bo‘lsa
  const getPaths = [
    `/cashier/orders?table_number=${encodeURIComponent(tableNumber)}`,
    `/orders?table_number=${encodeURIComponent(tableNumber)}`,
  ];

  try {
    const data = await tryPaths(getPaths, (p) => req(p, { signal }));
    const one = Array.isArray(data) ? data[0] : (data?.results?.[0] ?? data);
    if (one && (one.id || one.pk)) return normalizeOrder(one, tableNumber);
  } catch (_) {
    // ignore, create qilamiz
  }

  // 2) create (POST /orders) yoki /waiter/orders
  const postPaths = ["/orders", "/waiter/orders"];
  const created = await tryPaths(postPaths, (p) =>
    req(p, { method: "POST", body: { table_number: tableNumber }, signal })
  );
  return normalizeOrder(created, tableNumber);
}

export async function apiAddItem(orderId, productId, qty = 1) {
  const paths = [
    `/orders/${orderId}/items`,
    `/orders/${orderId}/add-item`,
  ];
  return tryPaths(paths, (p) =>
    req(p, { method: "POST", body: { product_id: productId, qty } })
  );
}

export async function apiSetQty(orderId, productId, qty) {
  const paths = [
    `/orders/${orderId}/items`,
    `/orders/${orderId}/set-qty`,
  ];
  return tryPaths(paths, (p) =>
    req(p, { method: "PATCH", body: { product_id: productId, qty } })
  );
}

export async function apiSendToKitchen(orderId) {
  const paths = [
    `/orders/${orderId}/send-to-kitchen`,
    `/orders/${orderId}/send_kitchen`,
  ];
  return tryPaths(paths, (p) => req(p, { method: "POST" }));
}

function normalizeOrder(o, tableNumber) { 
  return {
    id: o.id ?? o.pk,
    code: o.code ?? o.order_code ?? o.number ?? "—",
    tableNumber: o.table_number ?? o.table ?? tableNumber,
    guests: o.guests ?? o.people ?? 1,
    items: normalizeItems(o.items ?? o.order_items ?? []),
  };
}

function normalizeItems(items) {
  const list = asList(items);
  return list.map((it) => ({
    id: it.id ?? it.pk ?? crypto.randomUUID(),
    productId: it.product_id ?? it.product?.id ?? it.product ?? it.menu_item_id,
    name: it.name ?? it.product_name ?? it.product?.name ?? "—",
    price: Number(it.price ?? it.unit_price ?? it.product?.price ?? 0),
    qty: Number(it.qty ?? it.quantity ?? 1),
  }));
}
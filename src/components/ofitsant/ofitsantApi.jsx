const API_BASE = "https://bilgex.pythonanywhere.com";

/* ================= CORE REQUEST ================= */

export default async function req(path, { method = "GET", body, signal } = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (token) headers["Authorization"] = `Token ${token}`;

  const r = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  if (r.status === 204) return null;

  const text = await r.text().catch(() => "");

  if (!r.ok) {
    console.log("❌ BACKEND:", text);
    throw new Error(text || `HTTP ${r.status}`);
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ================= HELPERS ================= */

function asList(x) {
  if (Array.isArray(x)) return x;
  if (x?.results) return x.results;
  return [];
}

function normalizeOrder(o, tableNumber) {
  return {
    id: o.id,
    tableNumber: o.table_number ?? tableNumber,
    guestsCount: o.guests_count ?? o.guests ?? 1, // 🔥 Shu qatorni qo'shing
    code: o.number ?? o.id,
    items: normalizeItems(o.items ?? o.order_items ?? []),
  };
}

export async function apiUpdateOrderGuests(orderId, guestsCount) {
  return req(`/order/orders/${orderId}/`, {
    method: "PATCH",
    body: { guests_count: Number(guestsCount) }
  });
}

function normalizeItems(items) {
    return asList(items).map((it) => ({
      id: it.id,
      productId: it.product?.id ?? it.product,
      
      // Taom nomi (Oshxona va Ofitsiant uchun to'g'rilangan variant)
      name:
        it.kitchen_name_snapshot ??
        it.product_name_snapshot ??
        it.product?.name ??
        `#${it.product}`,

      price: Number(it.unit_price ?? it.price ?? 0),
      qty: Number(it.qty ?? it.quantity ?? 1)
      
      // 🔥 status: it.status qatori butunlay o'chirib tashlandi!
    }));
}

/* ================= TABLE ================= */

// 1. apiGetTables ni quyidagiga almashtiring (Filtrlar muammosiz ishlashi uchun)
export async function apiGetTables({ signal } = {}) {
  const data = await req(`/table/table/`, { signal });

  return asList(data).map((t, i) => {
    let st = "Bo‘sh";
    const s = String(t.status).toLowerCase();
    
    if (s === "busy" || t.is_busy) st = "Band";
    else if (s === "ready") st = "Tayyor";
    else if (s === "bill") st = "Hisob";

    return {
      id: t.id ?? i + 1,
      number: t.table_number ?? t.name ?? i + 1,
      status: st, // Endi doim aniq o'zbekcha status qaytadi
    };
  });
}

/* ================= ORDER ================= */

/* ================= ORDER ================= */

export async function apiGetOrCreateOrderByTable(tableId, guestsCount = null, { signal } = {}) {
  // 1) Ochiq buyurtma borligini tekshirish
  const data = await req(`/order/orders/?table=${tableId}`, { signal });
  const list = asList(data);

  const open = list.find(o => 
    o.status !== "closed" && o.status !== "paid" && o.status !== "served"
  );

  if (!open) {
    // 🔥 2) Agar yo'q bo'lsa, YANGI ochamiz (guests_count bilan!)
    const body = { 
      table: tableId, 
      type: "dine_in" 
    };

    if (guestsCount) {
      body.guests_count = guestsCount;
    }

    const created = await req(`/order/orders/`, {
      method: "POST",
      body: body,
      signal,
    });

    // Stolni "Band" qilish (agar backend o'zi qilmasa)
    await apiSetTableBusy(tableId).catch(() => {});

    return normalizeOrder(created, tableId);
  }

  // 🔥 3) Ochiq buyurtma bo'lsa, itemlarni olib kelamiz
  const itemsAll = await req(`/order/order-items/`, { signal });
  const filtered = asList(itemsAll).filter(x => (x.order?.id ?? x.order) === open.id);

  return normalizeOrder({ ...open, items: filtered }, tableId);
}

/* ================= ORDER ITEM ================= */

export async function apiAddItem(orderId, productOrId, qty = 1) {
  let product = productOrId;
  if (typeof productOrId === "number") {
    const list = await req(`/table/product/`);
    product = list.results?.find(p => p.id === productOrId) || list.find?.(p => p.id === productOrId);
  }
  if (!product) throw new Error("❌ Product topilmadi");

  const price = product.price ?? product.selling_price ?? product.unit_price ?? product.cost;

  const body = {
    order: Number(orderId),
    product: Number(product.id),
    qty: Number(qty),          // 🔥 Ikkala variantda ham jo'natamiz
    quantity: Number(qty),     // 🔥 Backend qaysi birini o'qisa ham ishlayveradi
    unit_price: Number(price),
  };

  return req(`/order/order-items/`, { method: "POST", body });
}

export async function apiSetQty(itemId, qty) {
  return req(`/order/order-items/${itemId}/`, {
    method: "PATCH",
    body: { 
      qty: Number(qty),       // 🔥 + va - tugmalari bosilganda ham
      quantity: Number(qty)   // 🔥 Ikkalasini yuboramiz
    },
  });
}

// top helper: table id topish
async function findTableByNumber(tableNumber, { signal } = {}) {
  const data = await req("/table/table/", { signal });
  const list = asList(data);

  // backend may return fields: table_number, name, id
  return list.find(t =>
    String(t.table_number) === String(tableNumber) ||
    String(t.name) === String(tableNumber) ||
    String(t.number) === String(tableNumber) || // if you normalized as `number`
    String(t.id) === String(tableNumber)
  );
}

// apiSetTableBusy: tableNumber qabul qiladi, avval id ni topadi, keyin patch qiladi
export async function apiSetTableBusy(tableNumber) {
  const data = await req("/table/table/");
  const list = asList(data);

  const found = list.find(t =>
    String(t.table_number) === String(tableNumber) ||
    String(t.name) === String(tableNumber) ||
    String(t.number) === String(tableNumber) ||
    String(t.id) === String(tableNumber)
  );

  if (!found) return;

  await req(`/table/table/${found.id}/`, {
    method: "PATCH",
    body: { status: "busy", is_busy: true } // 🔥 Ham status, ham is_busy o'zgaradi
  });
}

/* ================= SEND TO KITCHEN ================= */

export async function apiSendToKitchen(order){
  if (!order) return;

  try {
    await req(`/order/orders/${order.id}/send_to_kitchen/`, {
      method: "POST",
    });
  } catch {
    console.log("⚠️ already sent");
  }
}
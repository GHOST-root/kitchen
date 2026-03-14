export const ORIGIN = "https://bilgex.pythonanywhere.com";
export const API_BASE = `${ORIGIN}`;

function parseJsonSafe(text) {
  try { return JSON.parse(text); } catch { return text; }
}

function getErrorMessage(data, status) {
  if (data && typeof data === "object") {
    if (data.detail) return data.detail;
    if (data.status) return String(data.status);
    return JSON.stringify(data);
  }
  if (typeof data === "string" && data.trim()) return data;
  return `HTTP ${status}`;
}

async function request(path, { method = "GET", body, signal } = {}) {
  const url = `${API_BASE}${path}`;
  const token = localStorage.getItem("token");

  try {
    const headers = { Accept: "application/json" };
    if (token) headers["Authorization"] = `Token ${token}`;
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const options = { method, headers, signal };
    if (body !== undefined) options.body = JSON.stringify(body);

    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    const data = text ? parseJsonSafe(text) : null;

    if (!res.ok) {
      const error = new Error(getErrorMessage(data, res.status));
      error.httpStatus = res.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    console.error("❌ request failed:", e?.message || e);
    throw e;
  }
}

export function normalizeList(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.results)) return x.results;
  return [];
}

// 1. BUYURTMALARNI OLISH
export async function apiGetKitchenOrders({ signal } = {}) {
  try {
    const data = await request(`/order/orders/`, { method: "GET", signal });
    let list = Array.isArray(data) ? data : (data?.results || []);
    
    console.log("🔥 BACKENDDAN KELDI:", list);

    const filteredList = list
      .filter(o => 
        o.status === "sent_to_kitchen" || 
        o.status === "cooking" ||    // 🔥 XATO SHU YERDA EDI: "preparing" o'rniga "cooking" bo'lishi kerak!
        o.status === "ready"
      )
      .map(o => ({
        id: o.id,
        table_number: o.table?.number || o.table || o.number || "?",
        status: mapOrderStatusToFrontend(o.status),
        created_at: o.created_at || o.updated_at, 
        
        items: (o.items || o.order_items || []).map(it => ({
          id: it.id,
          productId: it.product?.id || it.product,
          name: it.kitchen_name_snapshot || it.product_name_snapshot || it.product?.name || "Nomsiz taom",
          qty: Number(it.quantity || it.qty || 1),
          note: it.note || ""
        }))
      }));

    console.log("✅ EKRANGA CHIQYAPTI:", filteredList);

    return filteredList;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("❌ OSHXONA API XATOSI:", err);
    }
    return [];
  }
}

// 2. BUYURTMA ICHIDAGI TAOMLARNI OLISH
export async function apiGetKitchenTicketItems({ ticketId, signal } = {}) {
  if (!ticketId) return [];

  const data = await request(`/order/order-items/`, { method: "GET", signal });
  const list = normalizeList(data);
  
  // order id ga qarab filtrlaymiz
  return list.filter((item) => String(item.order) === String(ticketId));
}

// 3. STATUSNI O'ZGARTIRISH (Backend'ga yuborish)
// 3. STATUSNI O'ZGARTIRISH (Backend'ga yuborish)
export async function apiSetKitchenTicketStatus(ticket, frontendStatus) {
  // Endi funksiya shunchaki id emas, butun ticket (buyurtma) obyektini qabul qiladi
  const ticketId = ticket.id;

  if (frontendStatus === "READY") {
    // Tayyor qilish uchun mark_ready ishlatiladi
    return await request(`/order/orders/${ticketId}/mark_ready/`, { method: "POST" });
  } 
  else if (frontendStatus === "COOKING") {
    // "Tayyorlanmoqda" uchun tayyorgarlik
    // Eslatma: Backend aynan "cooking" yoki "preparing" degan so'zni kutayotgan bo'lishi mumkin. 
    // Hozircha "cooking" deb yuboramiz.
    const payload = { status: "cooking" }; 

    // 🔥 XATONI AYLANIB O'TISh UCHUN YAMOQ:
    // Agar buyurtma dine_in bo'lsa-yu, stoli belgilanmagan bo'lsa, backend xato bermasligi uchun 1-stolni yuboramiz
    if (ticket.type === "dine_in" && !ticket.table) {
      payload.table = 1; 
    }

    return await request(`/order/orders/${ticketId}/`, {
      method: "PATCH",
      body: payload, 
    });
  }
}

// --- TAOM NOMLARINI EKRANGA CHIQARISH ---
export function itemToText(item) {
  // Swagger'ga asoslanib backend yuborayotgan aniq nomlarni tutib olamiz
  const name =
    item.kitchen_name_snapshot || // Agar oshxona uchun qisqartirilgan nom bo'lsa
    item.product_name_snapshot || // Asosiy taom nomi
    item.product?.name ||         // Agar product obyekti ichida kelsa
    item.product_name ||
    item.name ||
    item.title ||
    `Noma'lum taom (ID: ${item.product || '?'})`; // Mabodo nom topilmasa ID sini ko'rsatamiz

  // Miqdorini aniqlaymiz
  const qty = item.quantity ?? item.qty ?? item.count ?? 1;

  // Agar ofitsiant izoh (note) yozgan bo'lsa (masalan: "achchiq bo'lmasin"), oshxonaga ko'rinishi uchun qo'shamiz
  const note = item.note ? `\n ✍️ Izoh: ${item.note}` : "";

  return `${name} x${qty}${note}`;
}

// ==========================================
// STATUSLARNI TARJIMA QILISH (BACKEND <-> FRONTEND)
// ==========================================
export function mapOrderStatusToFrontend(status) {
  if (status === "sent_to_kitchen") return "Yangi";
  // 🔥 XATO YECHIMI: Backenddan "cooking" keladi
  if (status === "cooking") return "Tayyorlanmoqda"; 
  if (status === "ready") return "Tayyor";
  return "Yangi";
}

export function mapFrontendToOrderStatus(frontStatus) {
  const s = String(frontStatus).toLowerCase();
  if (s === "yangi") return "sent_to_kitchen";
  // 🔥 XATO YECHIMI: Backendga "cooking" jo'natamiz
  if (s === "tayyorlanmoqda") return "cooking"; 
  if (s === "tayyor") return "ready";
  return "sent_to_kitchen";
}

// BUYURTMA STATUSINI O'ZGARTIRISH (YANGI -> TAYYORLANMOQDA -> TAYYOR -> DONE)
export async function apiSetOrderStatus(orderId, newFrontStatus) {
  // 🔥 OSHXONADAN BUTUNLAY TOZALASH (Tayyordan keyin bosilganda)
  if (newFrontStatus === "DONE") {
    return request(`/order/orders/${orderId}/mark_served/`, { 
      method: "POST" 
    });
  }

  const backendStatus = mapFrontendToOrderStatus(newFrontStatus);
  
  // Tayyor holatiga o'tkazish uchun
  if (backendStatus === "ready") {
    return request(`/order/orders/${orderId}/mark_ready/`, {
      method: "POST"
    });
  }

  // Qolgan oddiy holatlar uchun (Yangi, Tayyorlanmoqda)
  return request(`/order/orders/${orderId}/`, {
    method: "PATCH",
    body: { status: backendStatus }
  });
}
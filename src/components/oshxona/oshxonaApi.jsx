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
export async function apiGetKitchenTickets({ branchId = 1, signal } = {}) {
  const data = await request(`/order/orders/`, { method: "GET", signal });
  let list = normalizeList(data);
  
  // Faqat oshxonaga tegishli va hali yopilmagan (closed) bo'lmagan buyurtmalarni ajratamiz
  // Va statuslarini daskamiz tushunadigan 'NEW', 'COOKING', 'READY' ga o'zgartirib qaytaramiz
  return list
    .filter(order => order.status !== "closed" && order.status !== "paid" && order.status !== "served")
    .map(order => ({
      ...order,
      // Statusni tarjima qilamiz
      status: mapStatusToFrontend(order.status), 
      // Daskada stol raqami chiqishi uchun
      table_number: order.table?.number || order.table || order.number 
    }));
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

export function itemToText(item) {
  const name =
    item.product_name ||
    item.product?.name ||
    item.name ||
    item.title ||
    "Taom";

  const qty = item.quantity ?? item.qty ?? item.count ?? 1;

  return `${name} x${qty}`;
}

// ==========================================
// STATUSLARNI TARJIMA QILISH (BACKEND <-> FRONTEND)
// ==========================================
function mapStatusToFrontend(backendStatus) {
  if (!backendStatus) return "NEW";
  
  const s = backendStatus.toLowerCase(); // Kichik harflarga o'tkazib olamiz

  // "YANGI" ustuniga tushishi kerak bo'lgan barcha statuslar (Backend nima jo'natsa ham tutib oladi):
  if (s === "sent_to_kitchen" || s === "new" || s === "open" || s === "pending") {
    return "NEW";
  }
  
  // "TAYYORLANMOQDA" ustuniga tushadiganlar:
  if (s === "cooking" || s === "in_progress") {
    return "COOKING";
  }
  
  // "TAYYOR" ustuniga tushadiganlar:
  if (s === "ready") {
    return "READY";
  }

  return backendStatus; 
}
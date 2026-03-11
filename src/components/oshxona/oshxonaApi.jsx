export const ORIGIN = "https://program90.pythonanywhere.com";
export const API_BASE = `${ORIGIN}/api`;

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
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

  console.groupCollapsed(`🌐 ${method} ${url}`);
  if (body !== undefined) console.log("request body:", body);

  try {
    const options = {
      method,
      headers: {
        Accept: "application/json",
      },
      signal,
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const res = await fetch(url, options);
    const text = await res.text().catch(() => "");
    const data = text ? parseJsonSafe(text) : null;

    console.log("status:", res.status);
    console.log("response:", data);

    if (!res.ok) {
      const error = new Error(getErrorMessage(data, res.status));
      error.httpStatus = res.status;
      error.payload = data;
      throw error;
    }

    return data;
  } catch (e) {
    if (e?.name === "AbortError") {
      console.warn("⏹️ aborted:", url);
      throw e;
    }
    console.error("❌ request failed:", e?.message || e);
    throw e;
  } finally {
    console.groupEnd();
  }
}

export function normalizeList(x) {
  if (Array.isArray(x)) return x;
  if (x && Array.isArray(x.results)) return x.results;
  return [];
}

export async function apiGetKitchenTickets({
  branchId = 1,
  statuses = ["NEW", "COOKING", "READY"],
  signal,
} = {}) {
  const status = encodeURIComponent(statuses.join(","));
  return await request(
    `/kitchen-tickets/?branch_id=${branchId}&status=${status}`,
    { method: "GET", signal }
  );
}

export async function apiGetKitchenTicketItems({ ticketId, signal } = {}) {
  if (!ticketId) return [];

  try {
    const data = await request(
      `/kitchen-ticket-items/?ticket=${encodeURIComponent(ticketId)}`,
      { method: "GET", signal }
    );
    return normalizeList(data);
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    console.warn("⚠️ ?ticket= filter ishlamadi, fallback all list");
  }

  const all = await request(`/kitchen-ticket-items/`, {
    method: "GET",
    signal,
  });

  const list = normalizeList(all);

  return list.filter((item) => {
    const v =
      item.ticket ??
      item.kitchen_ticket ??
      item.ticket_id ??
      item.kitchen_ticket_id;
    return String(v) === String(ticketId);
  });
}

/**
 * ENG MUHIM FUNKSIYA
 * Card ko‘chganda backend statusni o‘zgartiradi.
 */
export async function apiSetKitchenTicketStatus(ticketId, status) {
  return await request(`/kitchen-tickets/${ticketId}/`, {
    method: "PATCH",
    body: { status },
  });
}

export function itemToText(item) {
  const name =
    item.name ||
    item.title ||
    item.product_name ||
    item.product?.name ||
    "Item";

  const qty = item.qty ?? item.quantity ?? item.count ?? 1;

  return `${name} x${qty}`;
}
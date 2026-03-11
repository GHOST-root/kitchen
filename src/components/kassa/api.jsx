import { logError } from "./errorHandler.jsx";

const API_BASE = "https://program90.pythonanywhere.com/api";

// API chaqiruvida timeout qo'llash
const TIMEOUT_MS = 20000; // 20 soniya

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("API request timeout - server javob bermadi");
    }
    throw error;
  }
};

/**
 * Barcha buyurtmalarni olish (to'lov kutilayotgan)
 * GET /api/orders/
 */
export const apiGetUnpaidOrders = async () => {
  console.log("apiGetUnpaidOrders")
  try {
    const url = `${API_BASE}/orders/`;
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log("data", data)
    return Array.isArray(data) ? data : data?.results || data?.data || [];
  } catch (error) {
    logError("apiGetUnpaidOrders", error);
    throw error;
  }
};

/**
 * Stol bo'yicha buyurtma topish
 * GET /api/orders/?table=12
 */
export const apiFindOrderByTable = async (tableNumber) => {
  console.log("tableNumber ", tableNumber);
  
  try {
    const url = `${API_BASE}/orders/?table=${tableNumber}`;
    const response = await fetchWithTimeout(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data?.results || data?.data || [];
  } catch (error) {
    logError("apiFindOrderByTable", error);
    throw error;
  }
};

/**
 * To'lovni boshlash (orderni lock qilish)
 * POST /api/payments/start
 */
export const apiStartPayment = async (orderId) => {
  try {
    const url = `${API_BASE}/payments/start`;
    console.log("url ", url);
    
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logError("apiStartPayment", error);
    throw error;
  }
};

/**
 * Chegirma qo'llash
 * POST /api/orders/{order_id}/discount
 */
export const apiApplyDiscount = async (orderId, discountData) => {
  try {
    const url = `${API_BASE}/orders/${orderId}/discount`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: discountData.type || "percent",
        value: Number(discountData.value || 0),
        reason: discountData.reason || "Aksiya",
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logError("apiApplyDiscount", error);
    throw error;
  }
};

/**
 * To'lovni yakunlash
 * POST /api/payments/complete
 */
export const apiCompletePayment = async (paymentData) => {
  try {
    const url = `${API_BASE}/payments/complete`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: paymentData.orderId || paymentData.order_id,
        payment_method: paymentData.payment_method || "cash",
        cash_amount: Number(paymentData.cash_amount || 0),
        card_amount: Number(paymentData.card_amount || 0),
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logError("apiCompletePayment", error);
    throw error;
  }
};

/**
 * Chek chiqarish
 * POST /api/receipts/print
 */
export const apiPrintReceipt = async (orderId) => {
  try {
    const url = `${API_BASE}/receipts/print`;
    const response = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        order_id: orderId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    logError("apiPrintReceipt", error);
    throw error;
  }
};

import { ORIGIN } from "./api.jsx";

/**
 * WS /ws/kitchen sizda 404 qaytyapti.
 * Shuning uchun 1 marta urinib ko'ramiz, ishlamasa butunlay to'xtatamiz.
 * Natija: console spam bo'lmaydi.
 */
export function connectKitchenWS({ branchId = 1, onEvent }) {
  let ws = null;
  let closedManually = false;
  let attempted = false; // ✅ faqat 1 marta urinadi

  const wsUrl = (() => {
    const u = new URL(ORIGIN);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/ws/kitchen?branch_id=${encodeURIComponent(branchId)}`;
  })();

  function log(...a) { console.log("🔌 WS:", ...a); }

  function openOnce() {
    if (closedManually) return;
    if (attempted) return; // ✅ qayta-qayta urinmaydi
    attempted = true;

    log("connecting:", wsUrl);
    try {
      ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn("🔌 WS init fail (disabled):", e?.message || e);
      onEvent?.({ type: "ws.disabled" });
      return;
    }

    ws.onopen = () => {
      log("connected ✅");
      onEvent?.({ type: "ws.connected" });
    };

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        onEvent?.(data);
      } catch {
        onEvent?.({ type: "ws.raw", data: ev.data });
      }
    };

    ws.onerror = () => {
      // ✅ Sizda handshake 404 bo'ladi. Shunda WS ni o'chirib qo'yamiz.
      console.warn("🔌 WS failed (disabled). Server /ws/kitchen yo'q yoki 404.");
      onEvent?.({ type: "ws.disabled" });
      closedManually = true;
      try { ws?.close?.(); } catch {}
    };

    ws.onclose = () => {
      if (!closedManually) onEvent?.({ type: "ws.closed" });
    };
  }

  openOnce();

  return {
    close() {
      closedManually = true;
      try { ws?.close?.(); } catch {}
    },
  };
}
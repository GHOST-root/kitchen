import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { apiGetUnpaidOrders, apiFindOrderByTable, apiCompletePayment } from "./api.jsx";
import { logError } from "./errorHandler.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import './kassa.css'

export default function CashierHome(props) {
  const { user, logout } = useContext(AuthContext);
  const {
    unpaidOrders: unpaidOrdersProp,
    onSelectOrder: onSelectOrderProp,
    foundOrder: foundOrderProp,
    lockedByMe, baseTotal, discount, discountAmount, finalTotal,
    formatUZS: formatUZSProp, canClose, onFind: onFindProp, onBeginPayment, onVoid,
    isPaymentBlocking, canDiscount, onOpenDiscount, printerConnected, onTogglePrinter,
  } = props;

  const [table, setTable] = useState("");
  const [query, setQuery] = useState("");
  const [localUnpaidOrders, setLocalUnpaidOrders] = useState([]);
  const [localFoundOrder, setLocalFoundOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const tableRef = useRef(null);
  useEffect(() => { tableRef.current?.focus(); }, []);

  useEffect(() => {
    let mounted = true;
    if (unpaidOrdersProp) return undefined;
    setLoadingOrders(true);
    apiGetUnpaidOrders()
      .then((data) => { if (mounted) setLocalUnpaidOrders(Array.isArray(data) ? data : []); })
      .catch((err) => { logError("CashierHome:loadOrders", err); })
      .finally(() => mounted && setLoadingOrders(false));
    return () => { mounted = false; };
  }, [unpaidOrdersProp]);

  const unpaidOrders = unpaidOrdersProp ?? localUnpaidOrders;
  const foundOrder = foundOrderProp ?? localFoundOrder;

  const formatUZS = formatUZSProp || ((amount) => (Number(amount) || 0).toLocaleString("ru-RU"));

  const statusLabel = (status) => {
    if (lockedByMe) return { text: "TO‘LOV BOSHLANGAN", cls: "locked" };
    const s = String(status || "").toLowerCase();
    if (s === "ready" || s === "tayyor") return { text: "TAYYOR", cls: "ready" };
    if (s === "sent_to_kitchen" || s === "cooking" || s === "preparing") return { text: "OSHXONADA", cls: "bill" };
    return { text: "KUTILMOQDA", cls: "bill" };
  };

  const s = foundOrder ? statusLabel(foundOrder.status) : { text: "", cls: "" };

  const handleSearch = async () => {
    if (onFindProp) return onFindProp({ table, query });
    try {
      if (table) {
        const res = await apiFindOrderByTable(table);
        setLocalFoundOrder(Array.isArray(res) ? res[0] : res || null);
        return;
      }
      if (query) {
        const q = String(query).toLowerCase();
        const found = (unpaidOrders || []).find((o) => 
          String(o.id || "").toLowerCase().includes(q) || String(o.number || "").toLowerCase().includes(q)
        );
        setLocalFoundOrder(found || null);
      }
    } catch (err) {}
  };

  const onSelectOrder = (o) => {
    if (onSelectOrderProp) return onSelectOrderProp(o);
    setLocalFoundOrder(o);
  };

  const rawTotal = useMemo(() => Number(foundOrder?.total_amount || 0), [foundOrder]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", padding: "10px 16px", backgroundColor: "#fff", border: "1px solid var(--border)", borderRadius: "8px" }}>
        <div style={{ fontWeight: 600, color: "var(--text)" }}>👤 {user?.username} (Kassir)</div>
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={logout}>Tizimdan chiqish</button>
      </div>

      <div className="section">
        <div className="section-title">Buyurtmalar (to‘lov kutilmoqda)</div>
        {loadingOrders ? (
          <div className="mono-box text-muted">Yuklanmoqda...</div>
        ) : unpaidOrders?.length ? (
          <div className="row g-2">
            {unpaidOrders.map((o) => {
              const listTotal = Number(o.total_amount || 0);
              // 🔥 OBYEKT XATOSI OLDI OLINDI: Stolni xavfsiz ko'rsatish
              const safeTable = typeof o.table === 'object' ? (o.table?.number || o.table?.id || "?") : (o.table || "?");
              
              return (
                <div className="col-12 col-sm-6 col-lg-4" key={o.id}>
                  <button type="button" className="w-100 text-start mono-box" style={{ cursor: isPaymentBlocking ? "not-allowed" : "pointer", opacity: isPaymentBlocking ? 0.7 : 1 }} disabled={isPaymentBlocking} onClick={() => onSelectOrder(o)}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div style={{ fontWeight: 800 }}>Stol: {safeTable} • #{o.number || o.id}</div>
                      <span className={`order-status ${statusLabel(o.status).cls}`}>{statusLabel(o.status).text}</span>
                    </div>
                    <div className="muted-small mt-1">Jami: <b style={{ color: "var(--text)" }}>{formatUZS(listTotal)} so‘m</b></div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mono-box text-muted">To‘lov kutilayotgan buyurtma yo‘q. (Oshxonaga yuborilgan buyurtmalar bu yerda chiqadi)</div>
        )}
      </div>

      <div className="section">
        <div className="section-title">Buyurtmani topish</div>
        <form onSubmit={(e) => { e.preventDefault(); if (!isPaymentBlocking) handleSearch(); }}>
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-5">
              <div className="input-label">Stol raqami</div>
              <input ref={tableRef} className="form-control" value={table} onChange={(e) => setTable(e.target.value.replace(/\D/g, ""))} placeholder="12" type="tel" pattern="[0-9]*" disabled={isPaymentBlocking} />
            </div>
            <div className="col-12 col-md-2 d-grid">
              <button type="submit" className="btn btn-primary-green" disabled={isPaymentBlocking}>QIDIRISH</button>
            </div>
            <div className="col-12 col-md-5">
              <div className="input-label">Qidiruv: buyurtma ID</div>
              <input className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} disabled={isPaymentBlocking} />
            </div>
          </div>
        </form>
      </div>

      <div className="section">
        <div className="section-title">Topilgan buyurtma</div>
        {!foundOrder ? (
          <div className="mono-box text-muted">Hozircha buyurtma tanlanmagan/topilmadi.</div>
        ) : (
          <div className="mono-box" style={{ paddingBottom: 16 }}>
            <div className="order-head">
              <div>
                <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
                  Stol: {typeof foundOrder.table === 'object' ? foundOrder.table?.number : foundOrder.table} &nbsp;•&nbsp; Buyurtma: #{foundOrder.id}
                </div>
              </div>
              <div className={`order-status ${s.cls}`}>{s.text}</div>
            </div>

            <div className="items">
              {/* 🔥 ITEMLAR OBYEKT XATOSIDAN HIMOYALANDI */}
              {(foundOrder.items || foundOrder.order_items || []).map((it, idx) => {
                const qty = Number(it.qty || it.quantity || 1);
                const safeName = it.product_name_snapshot || it.product?.name || it.name || "Taom";
                const safePrice = Number(it.unit_price || it.price || 0);

                return (
                  <div key={idx} className="item-row" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 14, padding: "10px 0", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600 }}>{safeName}</div>
                    <div className="muted-small" style={{ whiteSpace: "nowrap" }}>
                      1 dona: <b style={{ color: "var(--text)" }}>{formatUZS(safePrice)} so‘m</b>
                    </div>
                    <div style={{ whiteSpace: "nowrap" }}>
                      <b>x {qty}</b> = <b style={{ color: "var(--text)" }}>{formatUZS(it.line_total || (safePrice * qty))} so‘m</b>
                    </div>
                  </div>
                );
              })}

              <div className="mt-3" style={{ borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                <div className="d-flex justify-content-between mb-1">
                  <div className="text-muted">Ovqatlar jami:</div>
                  <div style={{ fontWeight: 600 }}>{formatUZS(Number(foundOrder.total_amount || 0) - Number(foundOrder.service_amount || foundOrder.service_fee || 0))} so‘m</div>
                </div>
                <div className="d-flex justify-content-between">
                  <div className="text-muted">Xizmat haqqi:</div>
                  <div style={{ fontWeight: 600 }}>{formatUZS(foundOrder.service_amount || foundOrder.service_fee || 0)} so‘m</div>
                </div>
              </div>

              {discount && (
                <div className="mt-2" style={{ borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                  <div className="d-flex justify-content-between">
                    <div className="text-muted">Asosiy jami:</div>
                    <div style={{ fontWeight: 800 }}>{formatUZS(baseTotal ?? rawTotal)} so‘m</div>
                  </div>
                  <div className="d-flex justify-content-between">
                    <div className="text-muted">Chegirma ({discount.type === "PERCENT" ? `${discount.value}%` : "so‘m"}):</div>
                    <div style={{ fontWeight: 900, color: "#DC2626" }}>-{formatUZS(discountAmount || 0)} so‘m</div>
                  </div>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12 }} />

              <div className="total-row" style={{ paddingTop: 12, paddingBottom: 12, display: "flex", justifyContent: "flex-start", gap: 12, alignItems: "baseline" }}>
                <div className="total-label">JAMI TO'LOV:</div>
                <div className="total-amount">{formatUZS(finalTotal ?? rawTotal)} so‘m</div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)" }} />

              <div className="cta-row" style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 18, paddingTop: 12, paddingBottom: 6 }}>
                <button type="button" className="btn btn-outline-secondary" disabled={!canDiscount || isPaymentBlocking} onClick={onOpenDiscount}>Chegirma</button>
                <button type="button" className="btn btn-primary-green" onClick={onBeginPayment}>To‘lovni boshlash</button>
                <button type="button" className="btn pmb" onClick={onVoid} disabled={isPaymentBlocking}>Bekor</button>
              </div>

              {!canClose && <div className="alert alert-warning mt-3 mb-0">Bu buyurtma yopish uchun ruxsat etilmagan statusda.</div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { apiGetUnpaidOrders, apiFindOrderByTable } from "./api.jsx";
import { logError } from "./errorHandler.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";
import './kassa.css'

export default function CashierHome(props) {
  const { user, logout } = useContext(AuthContext);
  const {
    unpaidOrders: unpaidOrdersProp,
    onSelectOrder: onSelectOrderProp,
    foundOrder: foundOrderProp,

    lockedByMe,
    baseTotal,
    discount,
    discountAmount,
    finalTotal,

    formatUZS: formatUZSProp,
    canClose,
    onFind: onFindProp,
    onBeginPayment,
    onVoid,

    isPaymentBlocking,
    canDiscount,
    onOpenDiscount,

    printerConnected,
    onTogglePrinter,
  } = props;

  const [table, setTable] = useState("");
  const [query, setQuery] = useState("");

  const [localUnpaidOrders, setLocalUnpaidOrders] = useState([]);
  const [localFoundOrder, setLocalFoundOrder] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState(null);

  const tableRef = useRef(null);
  useEffect(() => {
    tableRef.current?.focus();
  }, []);

  // Load unpaid orders if parent didn't provide them
  useEffect(() => {
    let mounted = true;
    if (unpaidOrdersProp) return undefined;
    setLoadingOrders(true);
    apiGetUnpaidOrders()
      .then((data) => {
        if (!mounted) return;
        setLocalUnpaidOrders(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        logError("CashierHome:loadOrders", err);
        if (mounted) setError(err?.message || String(err));
      })
      .finally(() => mounted && setLoadingOrders(false));

    return () => {
      mounted = false;
    };
  }, [unpaidOrdersProp]);

  const unpaidOrders = unpaidOrdersProp ?? localUnpaidOrders;
  const foundOrder = foundOrderProp ?? localFoundOrder;

  const formatUZS =
    formatUZSProp ||
    ((amount) => {
      const n = Number(amount) || 0;
      return n.toLocaleString("ru-RU");
    });

  const statusLabel = (status) => {
    if (lockedByMe) return { text: "TO‘LOV BOSHLANGAN (bloklangan)", cls: "locked" };
    const s = String(status || "").toLowerCase();
    if (s === "ready" || s === "tayyor") return { text: "TAYYOR", cls: "ready" };
    if (s.includes("bill") || s.includes("requested") || s === "bill_requested")
      return { text: "HISOB SO‘RALGAN", cls: "bill" };
    if (s.includes("payment_pending") || s.includes("pending")) return { text: "TO‘LOV KUTILMOQDA", cls: "bill" };
    return { text: "YOPIB BO‘LMAYDI", cls: "bad" };
  };

  const s = foundOrder ? statusLabel(foundOrder.status) : { text: "", cls: "" };

  const handleSearch = async () => {
    if (onFindProp) return onFindProp({ table, query });

    try {
      // First try table search via API
      if (table) {
        const res = await apiFindOrderByTable(table);
        // API may return array or single
        const first = Array.isArray(res) ? res[0] : res;
        setLocalFoundOrder(first || null);
        return;
      }

      // fallback: search loaded unpaid orders by id or phone
      if (query) {
        const q = String(query).toLowerCase();
        const found = (unpaidOrders || []).find((o) => {
          if (!o) return false;
          return (
            String(o.id || "").toLowerCase().includes(q) ||
            String(o.number || "").toLowerCase().includes(q) ||
            String(o.note || "").toLowerCase().includes(q)
          );
        });
        setLocalFoundOrder(found || null);
        return;
      }

      setLocalFoundOrder(null);
    } catch (err) {
      logError("CashierHome:handleSearch", err);
      setError(err?.message || String(err));
    }
  };

  const onStartPayKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // if (!canClose || lockedByMe || isPaymentBlocking) return;
      if (onBeginPayment) onBeginPayment();
    }
  };

  const onSelectOrder = (o) => {
    if (onSelectOrderProp) return onSelectOrderProp(o);
    setLocalFoundOrder(o);
  };

  const rawTotal = useMemo(() => {
    if (!foundOrder) return 0;
    // try using provided total_amount or sum items
    if (foundOrder.total_amount) return Number(foundOrder.total_amount) || 0;
    if (Array.isArray(foundOrder.items)) return foundOrder.items.reduce((s, it) => s + (Number(it.total_amount || it.price || 0) || 0), 0);
    return 0;
  }, [foundOrder]);

  return (
    <>

      {/* 1. CHIQISH TUGMASI UCHUN MUSTAQIL BLOK (Dizaynni buzmaydi) */}
      <div 
        style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          marginBottom: "16px",
          padding: "10px 16px",
          backgroundColor: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "8px"
        }}
      >
        <div style={{ fontWeight: 600, color: "var(--text)" }}>
          👤 {user?.username} (Kassir)
        </div>
        <button 
          type="button" 
          className="btn btn-sm btn-outline-danger" 
          onClick={logout}
        >
          Tizimdan chiqish
        </button>
      </div>

      <div className="section">

        <div className="section-title">Buyurtmalar (to‘lov kutilmoqda)</div>

        {loadingOrders ? (
          <div className="mono-box text-muted">Yuklanmoqda...</div>
        ) : unpaidOrders?.length ? (
          <div className="row g-2">
            {unpaidOrders.map((o) => {
              const listTotal = Number(o.total_amount || o.subtotal_amount || 0) || 0;
              return (
                <div className="col-12 col-sm-6 col-lg-4" key={o.id}>
                  <button
                    type="button"
                    className="w-100 text-start mono-box"
                    style={{
                      cursor: isPaymentBlocking ? "not-allowed" : "pointer",
                      opacity: isPaymentBlocking ? 0.7 : 1,
                    }}
                    disabled={isPaymentBlocking}
                    onClick={() => onSelectOrder(o)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onSelectOrder(o);
                      }
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center">
                      <div style={{ fontWeight: 800 }}>
                        Stol: {o.table} • #{o.number}
                      </div>
                      <span className={`order-status ${o.status === "ready" ? "ready" : "bill"}`}>
                        {o.status && String(o.status).toLowerCase() === "ready" ? "TAYYOR" : "HISOB SO‘RALGAN"}
                      </span>
                    </div>

                    <div className="muted-small mt-1">
                      Jami: <b style={{ color: "var(--text)" }}>{formatUZS(listTotal)} so‘m</b>
                    </div>
                    <div className="muted-small mt-2">Enter / Click → ochish</div>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mono-box text-muted">To‘lov kutilayotgan buyurtma yo‘q.</div>
        )}

        <div className="d-flex justify-content-between align-items-center mt-3">
          <div className="muted-small">
            Printer: <b style={{ color: "var(--text)" }}>{printerConnected ? "Ulangan" : "Ulanmagan"}</b>
          </div>
          <button type="button" className="btn btn-sm btn-outline-secondary" onClick={onTogglePrinter} disabled={isPaymentBlocking}>
            {printerConnected ? "Uzish" : "Ulash"}
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">Buyurtmani topish</div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (isPaymentBlocking) return;
            handleSearch();
          }}
        >
          <div className="row g-2 align-items-end">
            <div className="col-12 col-md-5">
              <div className="input-label">Stol raqami</div>
              <input
                ref={tableRef}
                className="form-control"
                value={table}
                // MANA SHU YERNI TO'G'RILADIK: \D (katta D) yoki [^\d] yozilishi kerak
                onChange={(e) => setTable(e.target.value.replace(/\D/g, ""))} 
                placeholder="12"
                type="tel"
                // inputMode="numeric" (Buni izohdan chiqarib qo'ysangiz ham bo'ladi, telefonda qulayroq klaviatura ochiladi)
                pattern="[0-9]*"
                disabled={isPaymentBlocking}
              />
            </div>

            <div className="col-12 col-md-2 d-grid">
              <button type="submit" className="btn btn-primary-green" disabled={isPaymentBlocking}>
                QIDIRISH
              </button>
            </div>

            <div className="col-12 col-md-5">
              <div className="input-label">Qidiruv: buyurtma ID / telefon</div>
              <input className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="A1029 yoki +99890..." disabled={isPaymentBlocking} />
            </div>
          </div>
        </form>
      </div>

      <div className="section">
        <div className="section-title">Topilgan buyurtma</div>

        {!foundOrder ? (
          <div className="mono-box">
            <div className="text-muted">Hozircha buyurtma tanlanmagan/topilmadi.</div>
            <div className="muted-small mt-2">1 ekran — 1 vazifa: avval buyurtmani tanlang, keyin to‘lov.</div>
          </div>
        ) : (
          <div className="mono-box" style={{ paddingBottom: 16 }}>
            <div className="order-head">
              <div>
                <div style={{ fontWeight: 800, letterSpacing: 0.2 }}>
                  Stollarim: {foundOrder.table} &nbsp;•&nbsp; Buyurtma: #{foundOrder.id}
                </div>
                <div className="muted-small">Enter → “To‘lovni boshlash”.</div>
              </div>

              <div className={`order-status ${s.cls}`}>{s.text}</div>
            </div>

            <div className="items">
              {(foundOrder.items || []).map((it, idx) => {
                const qty = Number(it.qty || 1);
                const lineTotal = Number(it.total_amount || it.price || 0);
                const unit = qty > 0 ? Math.round(lineTotal / qty) : lineTotal;

                return (
                  <div key={idx} className="item-row" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 14, padding: "10px 0", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 600 }}>{it.name}</div>
                    <div className="muted-small" style={{ whiteSpace: "nowrap" }}>
                      1 dona: <b style={{ color: "var(--text)" }}>{formatUZS(unit)} so‘m</b>
                    </div>
                    <div style={{ whiteSpace: "nowrap" }}>
                      <b>x{qty}</b> = <b style={{ color: "var(--text)" }}>{formatUZS(lineTotal)} so‘m</b>
                    </div>
                  </div>
                );
              })}

              {discount && (
                <div className="mt-3" style={{ borderTop: "1px dashed var(--border)", paddingTop: 10 }}>
                  <div className="d-flex justify-content-between">
                    <div className="text-muted">Asosiy jami:</div>
                    <div style={{ fontWeight: 800 }}>{formatUZS(baseTotal ?? rawTotal)} so‘m</div>
                  </div>
                  <div className="d-flex justify-content-between">
                    <div className="text-muted">Chegirma ({discount.type === "PERCENT" ? `${discount.value}%` : "so‘m"}):</div>
                    <div style={{ fontWeight: 900 }}>-{formatUZS(discountAmount || 0)} so‘m</div>
                  </div>
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--border)", marginTop: 12 }} />

              <div className="total-row" style={{ paddingTop: 12, paddingBottom: 12, display: "flex", justifyContent: "flex-start", gap: 12, alignItems: "baseline" }}>
                <div className="total-label">JAMI:</div>
                <div className="total-amount">{formatUZS(finalTotal ?? rawTotal)} so‘m</div>
              </div>

              <div style={{ borderTop: "1px solid var(--border)" }} />

              <div className="cta-row" style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-start", gap: 18, paddingTop: 12, paddingBottom: 6 }}>
                <button type="button" className="btn btn-outline-secondary" disabled={!canDiscount || isPaymentBlocking} title={!canDiscount ? "Chegirma uchun ruxsat yo‘q" : ""} onClick={onOpenDiscount}>
                  Chegirma
                </button>

                <button type="button" className="btn btn-primary-green" onClick={onBeginPayment} onKeyDown={onStartPayKeyDown} >
                  To‘lovni boshlash
                </button>

                <button type="button" className="btn pmb" onClick={onVoid} disabled={isPaymentBlocking}>
                  Bekor
                </button>
              </div>

              {!canClose && (
                <div className="alert alert-warning mt-3 mb-0">Bu buyurtma <b>TAYYOR</b> yoki <b>HISOB SO‘RALGAN</b> emas — kassir yopishi mumkin emas.</div>
              )}

              {isPaymentBlocking && <div className="alert alert-secondary mt-3 mb-0">To‘lov jarayoni ketmoqda. Boshqa amallar vaqtincha o‘chiq.</div>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

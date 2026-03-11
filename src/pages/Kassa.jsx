import React, { useEffect, useMemo, useRef, useState } from "react";
import HeaderBar from "../components/kassa/HeaderBar.jsx";
import CashierHome from "../components/kassa/CashierHome.jsx";
import PaymentModal from "../components/kassa/PaymentModal.jsx";
import SuccessState from "../components/kassa/SuccessState.jsx";
import DiscountModal from "../components/kassa/DiscountModal.jsx";
import ErrorNotification from "../components/kassa/ErrorNotification.jsx";
import "../styles/kassastyles.css"

// App.jsx da
import {
  apiApplyDiscount,
  apiCompletePayment,
  apiFindOrderByTable,
  apiGetUnpaidOrders,
  apiPrintReceipt,
  apiStartPayment,
} from "../components/kassa/api.jsx";  // ← Shu yerda import qilingan

import { getErrorMessage } from "../components/kassa/errorHandler.jsx";


const formatUZS = (n) => {
  const s = Math.round(Number(n || 0)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function Kassa() {
  const [orders, setOrders] = useState([]);

  const [cashier] = useState("Ali");
  const [branch] = useState(1);

  // Permission (demo) — sizda keyin backenddan keladi
  const [canDiscount] = useState(false);

  const [isSyncOnline, setIsSyncOnline] = useState(true);

  // Printer holati (demo)
  const [printerConnected, setPrinterConnected] = useState(true);

  const [foundOrder, setFoundOrder] = useState(null);
  const [lockedByMe, setLockedByMe] = useState(false);

  const [paymentBlock, setPaymentBlock] = useState(false);

  const [view, setView] = useState("HOME");
  const [paidReceipt, setPaidReceipt] = useState(null);

  const openPaymentModalRef = useRef(null);
  const openDiscountModalRef = useRef(null);

  const [discountMap, setDiscountMap] = useState({});
  
  // Xato boshqaruvi
  const [errorMessage, setErrorMessage] = useState("");

  // 15 sekundda yangilash (API)
  useEffect(() => {
    const tick = async () => {
      console.log("🔄 POLL unpaid orders (20s)");
      try {
        console.log("try");
        
        const list = await apiGetUnpaidOrders();
        console.log("✅ POLL OK. count =", list.length);
        setOrders(list);
        console.log("list ",list );
        
        setErrorMessage(""); // Muvaffaqiyatli bo'lganda xato xabarini o'chir
      } catch (e) {
        const msg = getErrorMessage(e);
        console.error("❌ POLL FAIL:", msg);
        setErrorMessage(msg); // Foydalanuvchiga xabari ko'rsatish
      } finally {
        console.groupEnd();
      }
    };

    tick();
    
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const canCloseOrder = (order) =>
    order && (order.status === "READY" || order.status === "BILL_REQUESTED");

  const getBaseTotal = (order) =>
    order?.items?.reduce((sum, it) => sum + Number(it.price || 0), 0) || 0;

  const getDiscount = (order) => {
    if (!order?.id) return null;
    return discountMap[order.id] || null;
  };

  const computeDiscountAmount = (baseTotal, discount) => {
    if (!discount) return 0;
    const v = Number(discount.value || 0);

    // UI ichida PERCENT/AMOUNT deb yuradi
    if (discount.type === "PERCENT") {
      const pct = Math.min(100, Math.max(0, v));
      return Math.floor((baseTotal * pct) / 100);
    }
    return Math.min(baseTotal, Math.max(0, v));
  };

  const getTotal = (order) => {
    const base = getBaseTotal(order);
    const disc = getDiscount(order);
    const discAmt = computeDiscountAmount(base, disc);
    return Math.max(0, base - discAmt);
  };

  const unpaidOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === "ready" || o.status === "payment_pending"
    );
  }, [orders]);

  /**
   * Stol bo‘yicha topish:
   * GET /api/cashier/orders?table_number=12
   */
  const findOrder = async (table) => {
    console.groupCollapsed("🔎 FIND ORDER");
    try {
      const t = Number(table || 0);
      const data = await apiFindOrderByTable(t);

      const list = Array.isArray(data) ? data : data?.results || data?.data || [];
      const o = list[0] || null; // stol bo‘yicha odatda 1ta open/ready qaytadi

      console.log("✅ FIND OK:", o);
      setFoundOrder(o);
      setLockedByMe(false);
      setErrorMessage(""); // Muvaffaqiyatli bo'lganda xato xabarini o'chir
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error("❌ FIND FAIL:", msg);
      setFoundOrder(null);
      setLockedByMe(false);
      setErrorMessage(msg); // Xato xabarini ko'rsatish
    } finally {
      console.groupEnd();
    }
  };
  

  const selectOrder = (order) => {
    if (paymentBlock) return;
    setFoundOrder(order);
    setLockedByMe(false);
  };

  /**
   * To‘lovni boshlash (lock)
   * POST /api/payments/start {order_id}
   */
  const beginPayment = async () => {
    // if (!foundOrder) return;
    // if (!canCloseOrder(foundOrder)) return;

    console.groupCollapsed("💳 BEGIN PAYMENT (LOCK)");
    try {
      // await apiStartPayment(foundOrder.id);
 
      setLockedByMe(true);
      setPaymentBlock(true);
      openPaymentModalRef.current?.open();
      setErrorMessage("");

      console.log("✅ LOCK OK -> modal opened");
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error("❌ LOCK FAIL:", msg);
      setLockedByMe(false);
      setPaymentBlock(false);
      setErrorMessage(msg);
    } finally {
      console.groupEnd();
    }
  };

  const cancelPayment = () => {
    setLockedByMe(false);
    setPaymentBlock(false);
    openPaymentModalRef.current?.close();
  };

  /**
   * Chek chiqarish
   * POST /api/receipts/print {order_id}
   */
  const printReceipt = async () => {
    console.groupCollapsed("🧾 PRINT RECEIPT");
    try {
      if (!printerConnected) {
        const err = new Error("PRINTER_NOT_CONNECTED");
        err.code = "PRINTER_NOT_CONNECTED";
        throw err;
      }

      await apiPrintReceipt(foundOrder.id);

      console.log("✅ PRINT OK");
      return true;
    } catch (e) {
      if (e?.code === "PRINTER_NOT_CONNECTED") throw e;
      const err = new Error("PRINTER_ERROR");
      err.code = "PRINTER_ERROR";
      throw err;
    } finally {
      console.groupEnd();
    }
  };

  /**
   * To‘lovni yakunlash
   * POST /api/payments/complete
   * { order_id, payment_method:"mixed", cash_amount, card_amount }
   */
  const finishPayment = async ({ method, cashGiven, cardAmount }) => {
    console.groupCollapsed("✅ FINISH PAYMENT");

    const baseTotal = getBaseTotal(foundOrder);
    const disc = getDiscount(foundOrder);
    const discAmt = computeDiscountAmount(baseTotal, disc);
    const total = Math.max(0, baseTotal - discAmt);

    const receipt = {
      orderId: foundOrder.id,
      table: foundOrder.table,
      baseTotal,
      discount: disc ? { ...disc, amount: discAmt } : null,
      total,
      method,
      cashGiven,
      cardAmount,
      change:
        method === "CASH" ? Math.max(0, Number(cashGiven || 0) - total) : 0,
      time: new Date().toLocaleString(),
      offlineQueued: !isSyncOnline,
    };

    try {
      const payment_method =
        method === "CASH" ? "cash" : method === "CARD" ? "card" : "mixed";

      const payload = {
        orderId: foundOrder.id,
        payment_method,
        cash_amount: Number(cashGiven || 0),
        card_amount: Number(cardAmount || 0),
      };

      console.log("➡️ COMPLETE payload:", payload);
      await apiCompletePayment(payload);
      console.log("✅ COMPLETE OK");

      await printReceipt();

      setPaidReceipt(receipt);
      setView("SUCCESS");
      openPaymentModalRef.current?.close();
      setPaymentBlock(false);

      console.log("✅ SUCCESS");
    } catch (e) {
      console.error("❌ FINISH FAIL:", e?.message || e);

      // offline queue (UIga tegmaydi)
      try {
        const qKey = "pos_offline_queue";
        const prev = JSON.parse(localStorage.getItem(qKey) || "[]");
        prev.push({ type: "PAYMENT", receipt, at: Date.now() });
        localStorage.setItem(qKey, JSON.stringify(prev));
        console.warn("📦 OFFLINE QUEUE saved", receipt);
      } catch {
        // Offline queue xatosini ignore qil
      }

      throw e;
    } finally {
      console.groupEnd();
    }
  };

  const backToHome = () => {
    setView("HOME");
    setPaidReceipt(null);
    setFoundOrder(null);
    setLockedByMe(false);
    setPaymentBlock(false);
  };

  const openDiscount = () => {
    if (!foundOrder) return;
    if (paymentBlock) return;
    if (!canDiscount) return;
    openDiscountModalRef.current?.open();
  };

  /**
   * Chegirma
   * POST /api/orders/{order_id}/discount
   * { "type":"percent", "value":10, "reason":"Aksiya" }
   */
  const applyDiscount = async ({ type, value }) => {
    if (!foundOrder?.id) return;

    const base = getBaseTotal(foundOrder);
    const amount = computeDiscountAmount(base, { type, value });

    console.groupCollapsed("🏷️ APPLY DISCOUNT");
    try {
      // UI ichida PERCENT/AMOUNT, backend "percent"/"amount" kutyapti
      const apiType = type === "PERCENT" ? "percent" : "amount";

      await apiApplyDiscount(foundOrder.id, {
        type: apiType,
        value: Number(value || 0),
        reason: "Aksiya",
      });

      setDiscountMap((prev) => ({
        ...prev,
        [foundOrder.id]: { type, value, amount },
      }));
      setErrorMessage("");

      console.log("✅ DISCOUNT OK");
    } catch (e) {
      const msg = getErrorMessage(e);
      console.error("❌ DISCOUNT FAIL:", msg);
      setErrorMessage(msg);
    } finally {
      console.groupEnd();
    }
  };

  const clearDiscount = () => {
    if (!foundOrder?.id) return;
    setDiscountMap((prev) => {
      const copy = { ...prev };
      delete copy[foundOrder.id];
      return copy;
    });
  };

  return (
    <div className="pos-frame">
      <ErrorNotification 
        message={errorMessage} 
        onDismiss={() => setErrorMessage("")}
      />
      <div className="pos-shell">
        <HeaderBar
          cashier={cashier}
          branch={branch}
          isSyncOnline={isSyncOnline}
          onToggleSync={() => setIsSyncOnline((v) => !v)}
        />

        {view === "HOME" && (
          <CashierHome
            unpaidOrders={unpaidOrders}
            onSelectOrder={selectOrder}
            foundOrder={foundOrder}
            lockedByMe={lockedByMe}
            baseTotal={getBaseTotal(foundOrder)}
            discount={getDiscount(foundOrder)}
            discountAmount={
              foundOrder
                ? computeDiscountAmount(
                    getBaseTotal(foundOrder),
                    getDiscount(foundOrder)
                  )
                : 0
            }
            finalTotal={getTotal(foundOrder)}
            formatUZS={formatUZS}
            canClose={canCloseOrder(foundOrder)}
            onFind={findOrder}
            onBeginPayment={beginPayment}
            onVoid={() => {
              if (paymentBlock) return;
              setFoundOrder(null);
              setLockedByMe(false);
            }}
            isPaymentBlocking={paymentBlock}
            canDiscount={canDiscount}
            onOpenDiscount={openDiscount}
            printerConnected={printerConnected}
            onTogglePrinter={() => {
              if (paymentBlock) return;
              setPrinterConnected((v) => !v);
            }}
          />
        )}

        {view === "SUCCESS" && (
          <SuccessState
            receipt={paidReceipt}
            formatUZS={formatUZS}
            onReprint={() => window.print()}
            onBack={backToHome}
          />
        )}

        <PaymentModal
          ref={openPaymentModalRef}
          order={foundOrder}
          lockedByMe={lockedByMe}
          total={getTotal(foundOrder)}
          formatUZS={formatUZS}
          onCancel={cancelPayment}
          onFinish={finishPayment}
          isPaymentBlocking={paymentBlock}
        />

        <DiscountModal
          ref={openDiscountModalRef}
          canDiscount={canDiscount}
          isBlocked={paymentBlock}
          order={foundOrder}
          baseTotal={getBaseTotal(foundOrder)}
          formatUZS={formatUZS}
          currentDiscount={getDiscount(foundOrder)}
          onApply={applyDiscount}
          onClear={clearDiscount}
        />
      </div>
    </div>
  );
}

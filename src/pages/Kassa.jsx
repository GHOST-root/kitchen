import React, { useEffect, useMemo, useRef, useState } from "react";
import HeaderBar from "../components/kassa/HeaderBar.jsx";
import CashierHome from "../components/kassa/CashierHome.jsx";
import PaymentModal from "../components/kassa/PaymentModal.jsx";
import SuccessState from "../components/kassa/SuccessState.jsx";
import DiscountModal from "../components/kassa/DiscountModal.jsx";
import ErrorNotification from "../components/kassa/ErrorNotification.jsx";
import "../components/kassa/kassa.css"
import "../styles/kassastyles.css"

import {
  apiApplyDiscount,
  apiCompletePayment,
  apiFindOrderByTable,
  apiGetUnpaidOrders,
  apiPrintReceipt,
} from "../components/kassa/api.jsx";

import { getErrorMessage } from "../components/kassa/errorHandler.jsx";

const formatUZS = (n) => {
  const s = Math.round(Number(n || 0)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

export default function Kassa() {
  const [orders, setOrders] = useState([]);
  const [cashier] = useState("Ali");
  const [branch] = useState(1);
  const [canDiscount] = useState(false);
  const [isSyncOnline, setIsSyncOnline] = useState(true);
  const [printerConnected, setPrinterConnected] = useState(true);

  const [foundOrder, setFoundOrder] = useState(null);
  const [lockedByMe, setLockedByMe] = useState(false);
  const [paymentBlock, setPaymentBlock] = useState(false);

  const [view, setView] = useState("HOME");
  const [paidReceipt, setPaidReceipt] = useState(null);

  const openPaymentModalRef = useRef(null);
  const openDiscountModalRef = useRef(null);

  const [discountMap, setDiscountMap] = useState({});
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const tick = async () => {
      try {
        const list = await apiGetUnpaidOrders();
        setOrders(list);
        setErrorMessage(""); 
      } catch (e) {
        const msg = getErrorMessage(e);
        setErrorMessage(msg); 
      }
    };
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, []);

  const canCloseOrder = (order) => {
    if (!order) return false;
    const s = String(order.status).toLowerCase();
    return s !== "paid" && s !== "closed" && s !== "cancelled";
  };

  // 🔥 ASOSIY TO'G'RILANISH: Backend jami summani beradi
  const getBaseTotal = (order) => Number(order?.total_amount || 0);

  const getDiscount = (order) => {
    if (!order?.id) return null;
    return discountMap[order.id] || null;
  };

  const computeDiscountAmount = (baseTotal, discount) => {
    if (!discount) return 0;
    const v = Number(discount.value || 0);
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

  // 🔥 ASOSIY TO'G'RILANISH: Barcha to'lanmagan buyurtmalarni ekranga olib chiqadi (hech qaysini yashirmaydi)
  const unpaidOrders = useMemo(() => {
    return orders.filter(o => {
      const s = String(o.status || "").toLowerCase();
      return s !== "paid" && s !== "closed" && s !== "cancelled";
    });
  }, [orders]);

  const findOrder = async (table) => {
    try {
      const t = Number(table || 0);
      const data = await apiFindOrderByTable(t);
      const list = Array.isArray(data) ? data : data?.results || data?.data || [];
      const o = list[0] || null; 
      setFoundOrder(o);
      setLockedByMe(false);
      setErrorMessage(""); 
    } catch (e) {
      setFoundOrder(null);
      setLockedByMe(false);
      setErrorMessage(getErrorMessage(e)); 
    }
  };
  
  const selectOrder = (order) => {
    if (paymentBlock) return;
    setFoundOrder(order);
    setLockedByMe(false);
  };

  const beginPayment = async () => {
    try {
      setLockedByMe(true);
      setPaymentBlock(true);
      openPaymentModalRef.current?.open();
      setErrorMessage("");
    } catch (e) {
      setLockedByMe(false);
      setPaymentBlock(false);
      setErrorMessage(getErrorMessage(e));
    }
  };

  const cancelPayment = () => {
    setLockedByMe(false);
    setPaymentBlock(false);
    openPaymentModalRef.current?.close();
  };

  const printReceipt = async () => {
    try {
      if (!printerConnected) throw { code: "PRINTER_NOT_CONNECTED" };
      await apiPrintReceipt(foundOrder.id);
      return true;
    } catch (e) {
      throw e;
    }
  };

  const finishPayment = async ({ method, cashGiven, cardAmount }) => {
    const baseTotal = getBaseTotal(foundOrder);
    const disc = getDiscount(foundOrder);
    const discAmt = computeDiscountAmount(baseTotal, disc);
    const total = Math.max(0, baseTotal - discAmt);

    const receipt = {
      orderId: foundOrder.id,
      table: typeof foundOrder.table === 'object' ? foundOrder.table?.number : foundOrder.table,
      baseTotal,
      discount: disc ? { ...disc, amount: discAmt } : null,
      total,
      method,
      cashGiven,
      cardAmount,
      change: method === "CASH" ? Math.max(0, Number(cashGiven || 0) - total) : 0,
      time: new Date().toLocaleString(),
      offlineQueued: !isSyncOnline,
    };

    try {
      const payment_method = method === "CASH" ? "cash" : method === "CARD" ? "card" : "mixed";
      await apiCompletePayment({
        orderId: foundOrder.id,
        payment_method,
        cash_amount: Number(cashGiven || 0),
        card_amount: Number(cardAmount || 0),
      });

      await printReceipt().catch(() => {}); // Printer xatosiga qarab o'tirmaymiz

      setPaidReceipt(receipt);
      setView("SUCCESS");
      openPaymentModalRef.current?.close();
      setPaymentBlock(false);
    } catch (e) {
      throw e;
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
    if (!foundOrder || paymentBlock || !canDiscount) return;
    openDiscountModalRef.current?.open();
  };

  const applyDiscount = async ({ type, value }) => {
    if (!foundOrder?.id) return;
    const base = getBaseTotal(foundOrder);
    const amount = computeDiscountAmount(base, { type, value });
    try {
      const apiType = type === "PERCENT" ? "percent" : "amount";
      await apiApplyDiscount(foundOrder.id, { type: apiType, value: Number(value || 0), reason: "Aksiya" });
      setDiscountMap((prev) => ({ ...prev, [foundOrder.id]: { type, value, amount } }));
      setErrorMessage("");
    } catch (e) {
      setErrorMessage(getErrorMessage(e));
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
      <ErrorNotification message={errorMessage} onDismiss={() => setErrorMessage("")} />
      <div className="pos-shell">
        <HeaderBar cashier={cashier} branch={branch} isSyncOnline={isSyncOnline} onToggleSync={() => setIsSyncOnline((v) => !v)} />

        {view === "HOME" && (
          <CashierHome
            unpaidOrders={unpaidOrders}
            onSelectOrder={selectOrder}
            foundOrder={foundOrder}
            lockedByMe={lockedByMe}
            baseTotal={getBaseTotal(foundOrder)}
            discount={getDiscount(foundOrder)}
            discountAmount={foundOrder ? computeDiscountAmount(getBaseTotal(foundOrder), getDiscount(foundOrder)) : 0}
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

        {view === "SUCCESS" && <SuccessState receipt={paidReceipt} formatUZS={formatUZS} onReprint={() => window.print()} onBack={backToHome} />}

        <PaymentModal ref={openPaymentModalRef} order={foundOrder} lockedByMe={lockedByMe} total={getTotal(foundOrder)} formatUZS={formatUZS} onCancel={cancelPayment} onFinish={finishPayment} isPaymentBlocking={paymentBlock} />

        <DiscountModal ref={openDiscountModalRef} canDiscount={canDiscount} isBlocked={paymentBlock} order={foundOrder} baseTotal={getBaseTotal(foundOrder)} formatUZS={formatUZS} currentDiscount={getDiscount(foundOrder)} onApply={applyDiscount} onClear={clearDiscount} />
      </div>
    </div>
  );
}
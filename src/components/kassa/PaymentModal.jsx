import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal } from "bootstrap";
import './kassa.css'

const PaymentModal = forwardRef(function PaymentModal(
  { order, lockedByMe, total, formatUZS, onCancel, onFinish, isPaymentBlocking },
  ref
) {
  const modalElRef = useRef(null);
  const bsModalRef = useRef(null);

  const [method, setMethod] = useState("CASH"); // CASH | CARD | MIXED
  const [cashGiven, setCashGiven] = useState("");
  const [cardAmount, setCardAmount] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [printerError, setPrinterError] = useState(null);

  const cashRef = useRef(null);

  const change = useMemo(() => {
    if (method !== "CASH") return 0;
    const cg = Number(cashGiven || 0);
    return Math.max(0, cg - Number(total || 0));
  }, [method, cashGiven, total]);

  const handleOverlayClick = (e) => {
  // Agar foydalanuvchi oq oyna (content) ga emas, qora fonga bossa yopiladi
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    if (!modalElRef.current) return;

    bsModalRef.current = new Modal(modalElRef.current, {
      // backdrop ni o'chirib tashlaymiz (yoki true qilib qo'yamiz)
      backdrop: true, 
      // keyboard (ESC) bilan ham yopilishiga ruxsat beramiz
      keyboard: true, 
    });

    // Qora fonga bosib (yoki ESC bilan) modalni yopganda
    // onCancel funksiyasi ham ishga tushishi uchun buni yozamiz:
    const handleHidden = () => {
      onCancel(); // Modal yopilganda state larni tozalaydi
    };
    modalElRef.current.addEventListener("hidden.bs.modal", handleHidden);

    const onShown = () => {
      setTimeout(() => {
        if (method === "CASH") cashRef.current?.focus();
      }, 0);
    };

    modalElRef.current.addEventListener("shown.bs.modal", onShown);

    return () => {
      try {
        modalElRef.current?.removeEventListener("hidden.bs.modal", handleHidden);
        modalElRef.current?.removeEventListener("shown.bs.modal", onShown);
        bsModalRef.current?.dispose();
      } catch {
        // Cleanup error
      }
      bsModalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => bsModalRef.current?.show(),
    close: () => bsModalRef.current?.hide(),
  }));

  useEffect(() => {
    setMethod("CASH");
    setCashGiven("");
    setCardAmount("");
    setIsSubmitting(false);
    setPrinterError(null);
  }, [order?.id]);

  const canFinish = () => {
    if (!order || !lockedByMe) return false;
    if (isSubmitting) return false;
    if (printerError) return false;

    if (method === "CASH") return Number(cashGiven || 0) >= Number(total || 0);
    if (method === "CARD") return true;

    const c = Number(cashGiven || 0);
    const ca = Number(cardAmount || 0);
    return c + ca >= Number(total || 0);
  };

  const submit = async () => {
    if (!canFinish()) return;
    setIsSubmitting(true);
    setPrinterError(null);

    try {
      await onFinish({
        method,
        cashGiven: Number(cashGiven || 0),
        cardAmount: Number(cardAmount || 0),
      });
    } catch (e) {
      const msg =
        e?.code === "PRINTER_NOT_CONNECTED"
          ? "Printer ulanmagan. Qayta urinib ko‘ring yoki bekor qiling."
          : "Printer xatosi. Qayta urinib ko‘ring yoki bekor qiling.";

      setPrinterError(msg);
      setIsSubmitting(false);
    }
  };

  const retryPrint = async () => {
    if (isSubmitting) return;
    setPrinterError(null);
    await submit();
  };

  const cancel = () => {
    if (isSubmitting) return;
    setPrinterError(null);
    onCancel();
  };

  const isUiLocked = isSubmitting || !!printerError;

  // ✅ Enter: yakunlash / retry
  const onEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (printerError) retryPrint();
    else submit();
  };

  return (
    <>
    <div className="modal fade" tabIndex="-1" ref={modalElRef} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          style={{ borderRadius: 16, borderColor: "var(--border)" }}
        >
          <div className="modal-header">
            <div>
              <h5 className="modal-title" style={{ marginBottom: 2 }}>
                TO‘LOV
              </h5>
              <div className="muted-small">
                Stol: <b>{order?.table ?? "-"}</b> &nbsp;•&nbsp; Buyurtma:{" "}
                <b>#{order?.id ?? "-"}</b>
              </div>
            </div>

            <button
              type="button"
              className="btn-close"
              onClick={cancel}
              aria-label="Close"
              disabled={isSubmitting}
            />
          </div>

          <div className="modal-body">
            <div className="d-flex justify-content-between align-items-baseline mb-3">
              <div className="text-muted">JAMI:</div>
              <div className="total-amount">{formatUZS(total)} so‘m</div>
            </div>

            {printerError && (
              <div className="alert alert-danger mb-3">
                <b>Printer error:</b> {printerError}
                <div className="mt-2 muted-small">Enter → Retry</div>
              </div>
            )}

            <div className="mb-2" style={{ fontWeight: 700 }}>
              To‘lov turi:
            </div>

            <div className="d-grid gap-2 mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payType"
                  id="payCash"
                  checked={method === "CASH"}
                  onChange={() => setMethod("CASH")}
                  disabled={isUiLocked}
                />
                <label className="form-check-label" htmlFor="payCash">
                  Naqd
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payType"
                  id="payCard"
                  checked={method === "CARD"}
                  onChange={() => setMethod("CARD")}
                  disabled={isUiLocked}
                />
                <label className="form-check-label" htmlFor="payCard">
                  Karta (terminal)
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="payType"
                  id="payMixed"
                  checked={method === "MIXED"}
                  onChange={() => setMethod("MIXED")}
                  disabled={isUiLocked}
                />
                <label className="form-check-label" htmlFor="payMixed">
                  Aralash
                </label>
              </div>
            </div>

            <div className="row g-2">
              <div className="col-12">
                <label className="form-label mb-1">Naqd berildi:</label>
                <input
                  ref={cashRef}
                  className="form-control"
                  value={cashGiven}
                  onChange={(e) => setCashGiven(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="65000"
                  disabled={method === "CARD" || isUiLocked}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={onEnter}
                />
              </div>

              <div className="col-12">
                <label className="form-label mb-1">Karta:</label>
                <input
                  className="form-control"
                  value={cardAmount}
                  onChange={(e) => setCardAmount(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  
                  disabled={method === "CASH" || isUiLocked} 
                  
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onKeyDown={onEnter}
                />
              </div>

              <div className="col-12">
                <div className="d-flex justify-content-between">
                  <div className="text-muted">Qaytim:</div>
                  <div style={{ fontWeight: 800 }}>{formatUZS(change)} so‘m</div>
                </div>
              </div>
            </div>

            {!lockedByMe && (
              <div className="alert alert-warning mt-3 mb-0">
                To‘lov boshlanmagan. Avval Home oynasida{" "}
                <b>“To‘lovni boshlash”</b> ni bosing.
              </div>
            )}

            {isPaymentBlocking && (
              <div className="alert alert-secondary mt-3 mb-0">
                To‘lov jarayoni ketmoqda. Boshqa amallar bloklangan.
              </div>
            )}
          </div>

          <div className="modal-footer d-flex justify-content-between">
            {printerError ? (
              <>
                <button
                  type="button"
                  className="btn pmb"
                  onClick={cancel}
                  disabled={isSubmitting}
                >
                  Bekor
                </button>

                <button
                  type="button"
                  className="btn btn-primary-green"
                  onClick={retryPrint}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Qayta urinilmoqda..." : "Retry"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="btn pmb"
                  onClick={cancel}
                  disabled={isSubmitting}
                >
                  Bekor
                </button>

                <button
                  type="button"
                  className="btn btn-primary-green"
                  onClick={submit}
                  disabled={!canFinish()}
                  title="Chek chiqarilmasdan buyurtma yopilmaydi"
                >
                  {isSubmitting ? "Yakunlanmoqda..." : "To‘lovni yakunlash"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  );
});

export default PaymentModal;

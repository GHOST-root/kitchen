import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Modal } from "bootstrap";

const DiscountModal = forwardRef(function DiscountModal(
  {
    canDiscount,
    isBlocked,
    order,
    baseTotal,
    formatUZS,
    currentDiscount,
    onApply,
    onClear,
  },
  ref
) {
  const modalElRef = useRef(null);
  const bsModalRef = useRef(null);

  const [type, setType] = useState("PERCENT"); // PERCENT | AMOUNT
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const inputRef = useRef(null);

  useEffect(() => {
    if (!modalElRef.current) return;

    bsModalRef.current = new Modal(modalElRef.current, {
      backdrop: "static",
      keyboard: false,
    });

    const onShown = () => {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select?.();
      }, 0);
    };

    modalElRef.current.addEventListener("shown.bs.modal", onShown);

    return () => {
      try {
        modalElRef.current?.removeEventListener("shown.bs.modal", onShown);
        bsModalRef.current?.dispose();
      } catch {
        // Cleanup error
      }
      bsModalRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => bsModalRef.current?.show(),
    close: () => bsModalRef.current?.hide(),
  }));

  useEffect(() => {
    if (!order?.id) return;
    // Don't call setState inside effect directly
    setType("PERCENT");
    setValue("");
    if (currentDiscount) {
      setType(currentDiscount.type);
      setValue(String(currentDiscount.value ?? ""));
    } else {
      setType("PERCENT");
      setValue("");
    }
  }, [order?.id, currentDiscount]);

  const computedAmount = useMemo(() => {
    const v = Number(value || 0);
    if (!baseTotal) return 0;

    if (type === "PERCENT") {
      const pct = Math.min(100, Math.max(0, v));
      return Math.floor((baseTotal * pct) / 100);
    }
    return Math.min(baseTotal, Math.max(0, v));
  }, [type, value, baseTotal]);

  const finalTotal = Math.max(0, Number(baseTotal || 0) - computedAmount);

  const close = () => bsModalRef.current?.hide();

  const apply = () => {
    setError("");

    if (!canDiscount) return setError("Chegirma uchun ruxsat yo‘q.");
    if (isBlocked) return setError("To‘lov jarayoni ketmoqda. Chegirma bloklangan.");
    if (!order) return setError("Buyurtma topilmadi.");

    const v = Number(value || 0);

    if (type === "PERCENT") {
      if (!(v > 0 && v <= 100)) return setError("Foiz 1 dan 100 gacha bo‘lishi kerak.");
    } else {
      if (!(v > 0 && v <= baseTotal))
        return setError("Chegirma summasi 1 dan jami summagacha bo‘lishi kerak.");
    }

    onApply({ type, value: v });
    close();
  };

  const clear = () => {
    setError("");
    onClear();
    close();
  };

  // ✅ Enter → Qo‘llash
  const onEnter = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!canDiscount || isBlocked) return;
    apply();
  };

  return (
    <div className="modal fade" tabIndex="-1" ref={modalElRef} aria-hidden="true">
      <div className="modal-dialog modal-dialog-centered">
        <div
          className="modal-content"
          style={{ borderRadius: 16, borderColor: "var(--border)" }}
        >
          <div className="modal-header">
            <div>
              <h5 className="modal-title" style={{ marginBottom: 2 }}>
                CHEGIRMA
              </h5>
              <div className="muted-small">
                Stol: <b>{order?.table ?? "-"}</b> &nbsp;•&nbsp; Buyurtma:{" "}
                <b>#{order?.id ?? "-"}</b>
              </div>
            </div>

            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={close}
              disabled={isBlocked}
            />
          </div>

          <div className="modal-body">
            {!canDiscount && (
              <div className="alert alert-warning mb-3">
                Chegirma uchun ruxsat yo‘q. (Permission required)
              </div>
            )}

            {isBlocked && (
              <div className="alert alert-secondary mb-3">
                To‘lov jarayoni ketmoqda. Chegirma bloklangan.
              </div>
            )}

            {error && <div className="alert alert-danger mb-3">{error}</div>}

            <div className="mb-2" style={{ fontWeight: 700 }}>
              Chegirma turi:
            </div>

            <div className="d-grid gap-2 mb-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="discType"
                  id="discPct"
                  checked={type === "PERCENT"}
                  onChange={() => setType("PERCENT")}
                  disabled={!canDiscount || isBlocked}
                />
                <label className="form-check-label" htmlFor="discPct">
                  Foiz (%)
                </label>
              </div>

              <div className="form-check">
                <input
                  className="form-check-input"
                  type="radio"
                  name="discType"
                  id="discAmt"
                  checked={type === "AMOUNT"}
                  onChange={() => setType("AMOUNT")}
                  disabled={!canDiscount || isBlocked}
                />
                <label className="form-check-label" htmlFor="discAmt">
                  Summa (so‘m)
                </label>
              </div>
            </div>

            <label className="form-label mb-1">
              {type === "PERCENT" ? "Foiz kiriting:" : "Chegirma summasi:"}
            </label>
            <input
              ref={inputRef}
              className="form-control"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
              placeholder={type === "PERCENT" ? "10" : "5000"}
              disabled={!canDiscount || isBlocked}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              onKeyDown={onEnter}
            />

            <div className="mt-3 mono-box">
              <div className="d-flex justify-content-between">
                <div className="text-muted">Asosiy jami:</div>
                <div style={{ fontWeight: 800 }}>{formatUZS(baseTotal)} so‘m</div>
              </div>
              <div className="d-flex justify-content-between">
                <div className="text-muted">Chegirma:</div>
                <div style={{ fontWeight: 800 }}>
                  -{formatUZS(computedAmount)} so‘m
                </div>
              </div>
              <div className="d-flex justify-content-between">
                <div className="text-muted">Yakuniy jami:</div>
                <div style={{ fontWeight: 900 }}>{formatUZS(finalTotal)} so‘m</div>
              </div>
              <div className="muted-small mt-2">Enter → Qo‘llash</div>
            </div>
          </div>

          <div className="modal-footer d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-outline-dangerish"
              onClick={clear}
              disabled={!canDiscount || isBlocked || !currentDiscount}
              title={!currentDiscount ? "Chegirma yo‘q" : ""}
            >
              Chegirmani olib tashlash
            </button>

            <button
              type="button"
              className="btn btn-primary-green"
              onClick={apply}
              disabled={!canDiscount || isBlocked}
            >
              Qo‘llash
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DiscountModal;

import React from "react";

export default function SuccessState({ receipt, formatUZS, onReprint, onBack }) {
  return (
    <div className="section" style={{ display: "grid", placeItems: "center" }}>
      <div className="success-box">
        <div className="d-flex align-items-center gap-2 mb-2">
          <span style={{ fontSize: 22 }}>✅</span>
          <div className="success-title" style={{ fontSize: 18 }}>
            TO‘LOV QABUL QILINDI
          </div>
        </div>

        <div className="text-muted mb-3">Buyurtma yopildi</div>

        <div className="mono-box mb-3">
          <div className="d-flex justify-content-between">
            <div>Buyurtma:</div>
            <div style={{ fontWeight: 800 }}>#{receipt?.orderId}</div>
          </div>
          <div className="d-flex justify-content-between">
            <div>Stol:</div>
            <div style={{ fontWeight: 800 }}>{receipt?.table}</div>
          </div>
          <div className="d-flex justify-content-between">
            <div>Jami:</div>
            <div style={{ fontWeight: 800 }}>{formatUZS(receipt?.total)} so‘m</div>
          </div>
          <div className="d-flex justify-content-between">
            <div>To‘lov turi:</div>
            <div style={{ fontWeight: 800 }}>{receipt?.method}</div>
          </div>
          <div className="d-flex justify-content-between">
            <div>Vaqt:</div>
            <div style={{ fontWeight: 800 }}>{receipt?.time}</div>
          </div>

          {receipt?.offlineQueued && (
            <div className="alert alert-warning mt-3 mb-0">
              Internet uzilgan: to‘lov <b>local queue</b> ga yozildi, sinx qaytganda serverga yuboriladi.
            </div>
          )}
        </div>

        <div className="d-grid gap-2">
          <button type="button" className="btn btn-outline-secondary" onClick={onReprint}>
            🧾 Chek qayta chiqarish
          </button>
          <button type="button" className="btn btn-primary-green" onClick={onBack}>
            ⬅️ Asosiy ekranga qaytish
          </button>
        </div>
      </div>
    </div>
  );
}

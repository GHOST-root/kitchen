import React from "react";

export default function TicketModal({ open, ticket, itemsText, onClose }) {
  if (!open || !ticket) return null;

  return (
    <div className="kds-modal-backdrop" onMouseDown={onClose}>
      <div
        className="kds-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h3 className="fw-bold text-primary">Buyurtma #{ticket.id}</h3>

        <div className="meta mb-3 border-bottom pb-2">
          <span className="fw-bold">Stol:</span> {ticket.table_number_snapshot || ticket.table_number || "?"} &nbsp; | &nbsp;
          <span className="fw-bold">Status:</span> {ticket.status}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: "#475569" }}>Buyurtma qilingan taomlar:</div>

          {/* 🔥 MANA SHU YER HAM TO'G'RILANDI */}
          <ul className="list-unstyled mt-2">
            {itemsText?.length ? (
              itemsText.map((item, i) => (
                <li key={item.id || i} className="mb-2 bg-light p-2 rounded border">
                  <div className="d-flex align-items-start gap-2">
                    <span className="badge bg-primary fs-6">{item.qty}x</span>
                    <div>
                      <div className="fw-bold fs-6">{item.name}</div>
                      {item.note && <div className="text-muted mt-1" style={{ fontSize: "13px", fontStyle: "italic" }}>✍️ Izoh: {item.note}</div>}
                    </div>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-muted">(Taomlar yo‘q)</li>
            )}
          </ul>
        </div>

        <div className="close-row mt-4">
          <button type="button" className="btn btn-secondary w-100 fw-bold py-2" onClick={onClose}>
            YOPISH
          </button>
        </div>
      </div>
    </div>
  );
}
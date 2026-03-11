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
        <h3>Ticket #{ticket.id}</h3>

        <div className="meta">
          Stol: {ticket.table_number_snapshot || ticket.table_number || "?"} •
          Status: {ticket.status}
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Itemlar</div>

          <ul
            style={{
              margin: "6px 0 0",
              paddingLeft: 18,
              color: "var(--text2)",
              fontSize: 14,
            }}
          >
            {itemsText?.length ? (
              itemsText.map((x, i) => <li key={i}>{x}</li>)
            ) : (
              <li>(itemlar yo‘q)</li>
            )}
          </ul>
        </div>

        <div className="close-row">
          <button type="button" className="kds-btn" onClick={onClose}>
            ORTGA
          </button>
        </div>
      </div>
    </div>
  );
}
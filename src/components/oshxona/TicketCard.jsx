import React, { memo } from "react";

// 🔥 1. Vaqtni xavfsiz o'qib oluvchi funksiya
function parseSafeTime(isoStr) {
  if (!isoStr) return new Date();
  let s = String(isoStr).replace(" ", "T"); 
  if (!s.endsWith("Z") && !s.match(/[+-]\d\d:?\d\d$/)) {
    s += "Z";
  }
  return new Date(s);
}

function fmtClock(iso) {
  const t = parseSafeTime(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function minutesSince(iso) {
  const t = parseSafeTime(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

const TicketCard = memo(function TicketCard({
  ticket,
  items,
  busy,
  onOpen,
}) {

  const createdAt = ticket.created_at || ticket.createdAt || null;
  const time = fmtClock(createdAt);
  const mins = minutesSince(createdAt);
  const timeLabel = time ? `${time}` : "";

  return (
    <div
      className="ticket-card"
      data-status={ticket.status}
      role="button"
      tabIndex={0}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpen?.(ticket);
      }}
      aria-busy={busy ? "true" : "false"}
    >
      <div className="ticket-head d-flex justify-content-between align-items-center mb-2">
        <div className="table-number fw-bold" style={{ fontSize: "1.1rem" }}>
          Stol {ticket.table_number_snapshot || ticket.table_number || "?"}
        </div>
        <div className="ticket-time fw-bold text-danger">{timeLabel}</div>
      </div>

      {/* 🔥 MANA SHU YER TO'G'RILANDI (Obyekt xatosi) */}
      <ul className="list-unstyled mt-2 mb-0">
        {items?.length ? (
          items.map((item, i) => (
            <li key={item.id || i} className="mb-2 border-bottom pb-1">
              <div className="fw-bold" style={{ fontSize: "14px", color: "#1e293b", lineHeight: "1.2" }}>
                <span className="text-primary me-2">{item.qty}x</span> 
                {item.name}
              </div>
              {item.note && (
                <div className="text-muted ms-3 mt-1" style={{ fontSize: "12px", fontStyle: "italic" }}>
                  ✍️ {item.note}
                </div>
              )}
            </li>
          ))
        ) : (
          <li className="text-muted small">(Taomlar yo'q)</li>
        )}
      </ul>
      
      {busy && <div className="text-center mt-2 small text-muted fw-bold">Yuklanmoqda...</div>}
    </div>
  );
});

export default TicketCard;
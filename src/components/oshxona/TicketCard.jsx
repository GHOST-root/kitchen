import React, { memo } from "react";
import { useDraggable } from "@dnd-kit/core";

function fmtClock(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function minutesSince(iso) {
  if (!iso) return 0;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
}

const TicketCard = memo(function TicketCard({
  ticket,
  items,
  busy,
  onOpen,
  onAction,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `ticket:${ticket.id}`,
    data: {
      ticketId: ticket.id,
      currentStatus: ticket.status,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.55 : 1,
        zIndex: isDragging ? 1000 : "auto",
      }
    : undefined;

  const createdAt = ticket.created_at || ticket.createdAt || null;
  const time = fmtClock(createdAt);
  const mins = minutesSince(createdAt);
  const timeLabel = time ? `${time} (+${mins}m)` : "";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="ticket-card"
      data-status={ticket.status}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onDoubleClick={() => onOpen?.(ticket)}
      aria-busy={busy ? "true" : "false"}
    >
      <div className="ticket-head">
        <div className="table-number">
          Stol {ticket.table_number_snapshot || ticket.table_number || "?"}
        </div>
        <div className="ticket-time">{timeLabel}</div>
      </div>

      <ul className="ticket-items">
        {items?.length ? (
          items.slice(0, 6).map((text, i) => <li key={i}>{text}</li>)
        ) : (
          <li>(itemlar yo‘q)</li>
        )}
      </ul>

      {ticket.status === "NEW" && (
        <button
          type="button"
          className="kds-btn"
          disabled={!!busy}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAction?.(ticket, "COOKING");
          }}
        >
          {busy ? "..." : "QABUL QIL"}
        </button>
      )}

      {ticket.status === "COOKING" && (
        <button
          type="button"
          className="kds-btn"
          disabled={!!busy}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onAction?.(ticket, "READY");
          }}
        >
          {busy ? "..." : "TAYYOR"}
        </button>
      )}
    </div>
  );
});

export default TicketCard;
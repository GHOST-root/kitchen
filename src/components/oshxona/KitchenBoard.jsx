import React, { useEffect, useMemo, useRef, useState } from "react";

// DndContext larni olib tashlaganmiz
import TicketCard from "./TicketCard.jsx";
import TicketModal from "./TicketModal.jsx";
import {
  apiGetKitchenTickets,
  apiGetKitchenTicketItems,
  apiSetKitchenTicketStatus,
  normalizeList,
  itemToText,
} from "./oshxonaApi.jsx";

const COLS = [
  { key: "NEW", title: "YANGI" },
  { key: "COOKING", title: "TAYYORLANMOQDA" },
  { key: "READY", title: "TAYYOR" },
];

export default function KitchenBoard({ branchId = 1 }) {
  const [tickets, setTickets] = useState([]);
  const [itemsByTicket, setItemsByTicket] = useState({});
  const [busyMap, setBusyMap] = useState({});
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const abortRef = useRef(null);

  const grouped = useMemo(() => {
    const map = { NEW: [], COOKING: [], READY: [] };

    for (const t of tickets) {
      if (map[t.status]) map[t.status].push(t);
    }

    // Eng eski buyurtmalar doim tepada turishi uchun
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return ta - tb; 
      });
    }

    return map;
  }, [tickets]);

  function setBusy(ticketId, value) {
    setBusyMap((prev) => ({ ...prev, [ticketId]: value }));
  }

  async function loadAll(reason = "manual") {
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      setError("");
      const data = await apiGetKitchenTickets({ branchId, statuses: ["NEW", "COOKING", "READY"], signal: ac.signal });
      const ticketList = normalizeList(data);
      setTickets(ticketList);

      const itemPairs = await Promise.all(
        ticketList.map(async (ticket) => {
          try {
            const items = await apiGetKitchenTicketItems({ ticketId: ticket.id, signal: ac.signal });
            return [String(ticket.id), items.map(itemToText)];
          } catch (e) {
            if (e?.name === "AbortError") throw e;
            return [String(ticket.id), []];
          }
        })
      );

      const nextItemsByTicket = {};
      for (const [ticketId, lines] of itemPairs) {
        nextItemsByTicket[ticketId] = lines;
      }
      setItemsByTicket(nextItemsByTicket);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Load error");
    }
  }

  // --- CHAP VA O'NG TUGMA MANTIG'I SHU YERDA ---
  async function handleStatusChange(ticket, direction) {
    if (!ticket?.id || busyMap[ticket.id]) return;

    let nextStatus = null;

    // 1. Agar CHAP tugma bosilsa (Oldinga o'tish)
    if (direction === "FORWARD") {
      if (ticket.status === "NEW") nextStatus = "COOKING";
      else if (ticket.status === "COOKING") nextStatus = "READY";
      else if (ticket.status === "READY") nextStatus = "DONE"; // Tayyordan keyin ekrandan yo'qoladi
    } 
    // 2. Agar O'NG tugma bosilsa (Orqaga qaytish)
    else if (direction === "BACKWARD") {
      if (ticket.status === "READY") nextStatus = "COOKING";
      else if (ticket.status === "COOKING") nextStatus = "NEW";
      // NEW dan orqaga yo'l yo'q
    }

    if (!nextStatus) return;

    const ticketId = ticket.id;
    setBusy(ticketId, true);
    setError("");

    try {
      // Backendga yuborish
      await apiSetKitchenTicketStatus(ticketId, nextStatus);

      // UI ni darhol o'zgartirish
      setTickets((prev) => {
        if (nextStatus === "DONE") {
          return prev.filter(t => t.id !== ticketId); // "DONE" bo'lsa ekrandan tozalaymiz
        }
        return prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t));
      });
      
      setTimeout(() => loadAll("after-click"), 300);
    } catch (e) {
      setError(e?.message || "Status update failed");
    } finally {
      setBusy(ticketId, false);
    }
  }

  useEffect(() => {
    loadAll("mount");
    const intervalId = setInterval(() => loadAll("poll-15s"), 15000);
    return () => {
      clearInterval(intervalId);
      abortRef.current?.abort?.();
    };
  }, [branchId]);

  return (
    <>
      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="d-flex justify-content-end mb-2 pe-3 gap-3" style={{ fontSize: "12px", color: "var(--muted)" }}>
        <span>🖱️ <b>Chap tugma:</b> Oldinga o'tkazish</span>
        <span>🖱️ <b>O'ng tugma:</b> Orqaga qaytarish</span>
      </div>

      <div className="kds-board">
        {COLS.map((col) => (
          <Column
            key={col.key}
            colKey={col.key}
            title={col.title}
            tickets={grouped[col.key]}
            itemsByTicket={itemsByTicket}
            busyMap={busyMap}
            onOpen={(ticket) => {
              setSelected(ticket);
              setModalOpen(true);
            }}
            onChangeStatus={handleStatusChange} 
          />
        ))}
      </div>

      <TicketModal
        open={modalOpen}
        ticket={selected}
        itemsText={selected ? itemsByTicket[String(selected.id)] || [] : []}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
      />
    </>
  );
}

// Kolonka komponenti
function Column({ colKey, title, tickets, itemsByTicket, busyMap, onOpen, onChangeStatus }) {
  return (
    <div className="kds-col" data-col={colKey}>
      <div className="kds-col-title">{title}</div>

      <div className="kds-stack">
        {tickets.map((ticket) => (
          <div 
            key={ticket.id} 
            
            // CHAP TUGMA (Oldinga)
            onClick={(e) => {
              e.preventDefault();
              onChangeStatus(ticket, "FORWARD");
            }} 
            
            // O'NG TUGMA (Orqaga)
            onContextMenu={(e) => {
              e.preventDefault(); // Brauzerning menyusi (Copy, Paste...) chiqib qolmasligini ta'minlaydi
              onChangeStatus(ticket, "BACKWARD");
            }}

            style={{ 
              cursor: "pointer", 
              transition: "transform 0.1s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <TicketCard
              ticket={ticket}
              busy={!!busyMap[ticket.id]}
              items={itemsByTicket[String(ticket.id)] || []}
              onOpen={onOpen}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
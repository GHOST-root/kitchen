import React, { useEffect, useMemo, useRef, useState } from "react";
import TicketCard from "./TicketCard.jsx";
import TicketModal from "./TicketModal.jsx";
import { apiGetKitchenOrders, apiSetOrderStatus } from "./oshxonaApi.jsx";

const COLS = [
  { key: "Yangi", title: "YANGI", colColor: "NEW" },
  { key: "Tayyorlanmoqda", title: "TAYYORLANMOQDA", colColor: "COOKING" },
  { key: "Tayyor", title: "TAYYOR", colColor: "READY" },
];

export default function KitchenBoard() {
  const [tickets, setTickets] = useState([]);
  const [busyMap, setBusyMap] = useState({});
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const abortRef = useRef(null);

  const grouped = useMemo(() => {
    const map = { "Yangi": [], "Tayyorlanmoqda": [], "Tayyor": [] };

    // Xotiradan oldin pishirilgan taomlar ro'yxatini olamiz
    const cookedItemIds = JSON.parse(localStorage.getItem("cooked_items") || "[]");

    tickets.forEach(t => {
      // 1-QOIDA: Agar backend butun buyurtmani "Tayyor" desa yoki biz uni aynan Tayyorga o'tkazgan bo'lsak,
      // uni hech qanday filtrsiz to'g'ridan-to'g'ri "Tayyor" ustuniga yuboramiz. Yo'qolib ketmaydi!
      if (t.status === "Tayyor") {
        map["Tayyor"].push(t);
        return;
      }

      // 2-QOIDA: Agar buyurtma "Yangi" yoki "Tayyorlanmoqda" kelsa (masalan, keyinroq Choy qo'shilgan bo'lsa),
      // biz uning ichidagi taomlarni 2 ga bo'lamiz: Pishganlar va Yangilar
      const cookedItems = [];
      const freshItems = [];

      (t.items || []).forEach(it => {
        if (cookedItemIds.includes(it.id)) {
          cookedItems.push(it);
        } else {
          freshItems.push(it);
        }
      });

      // Pishmaganlari (masalan faqat "Choy") o'zining asl statusi (Yangi/Tayyorlanmoqda) bo'yicha qoladi
      if (freshItems.length > 0) {
        map[t.status].push({ ...t, items: freshItems });
      }

      // Allaqachon pishib bo'lganlari (oldindan tayyor bo'lgan ovqatlar) yana Yangiga tushib qolmasligi uchun 
      // ularni ekranda alohida kartochka qilib "Tayyor" ustuniga o'tkazib qo'yamiz.
      if (cookedItems.length > 0) {
        map["Tayyor"].push({ ...t, items: cookedItems, status: "Tayyor" });
      }
    });

    // TAYYOR USTUNINI STOL BO'YICHA BIRLASHTIRISH
    const readyMap = {};
    map["Tayyor"].forEach(t => {
       const table = String(t.table_number);
       if (!readyMap[table]) {
           readyMap[table] = { ...t, id: `ready-table-${table}`, items: [...(t.items || [])] };
       } else {
           readyMap[table].items.push(...(t.items || []));
       }
    });
    map["Tayyor"] = Object.values(readyMap);

    // Vaqtiga qarab tartiblash
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
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
      const data = await apiGetKitchenOrders({ signal: ac.signal });
      setTickets(data);
    } catch (e) {
      if (e?.name === "AbortError") return;
      setError(e?.message || "Yuklashda xatolik");
    }
  }

  async function handleStatusChange(ticket, direction) {
    if (!ticket?.id || busyMap[ticket.id]) return;

    // 🔥 BLOKLASH: Tayyor ustunidagi kartochkani kassir pulini to'lamaguncha yo'qotib bo'lmaydi
    if (ticket.status === "Tayyor" || String(ticket.id).startsWith("ready-table")) {
       return; 
    }

    let nextStatus = null;
    if (direction === "FORWARD") {
      if (ticket.status === "Yangi") nextStatus = "Tayyorlanmoqda";
      else if (ticket.status === "Tayyorlanmoqda") nextStatus = "Tayyor";
    } 
    else if (direction === "BACKWARD") {
      if (ticket.status === "Tayyorlanmoqda") nextStatus = "Yangi";
    }

    if (!nextStatus) return;

    const ticketId = ticket.id;
    setBusy(ticketId, true);
    setError("");

    try {
      await apiSetOrderStatus(ticketId, nextStatus);

      // 🔥 3-QADAM: Agar taom "Tayyor" ga o'tayotgan bo'lsa, uning ID larini xotiraga yozamiz
      if (nextStatus === "Tayyor") {
          const cookedItemIds = JSON.parse(localStorage.getItem("cooked_items") || "[]");
          (ticket.items || []).forEach(it => {
              if (!cookedItemIds.includes(it.id)) {
                  cookedItemIds.push(it.id);
              }
          });
          // Xotira to'lib ketmasligi uchun faqat oxirgi 1000 ta taomni eslab qolamiz
          if (cookedItemIds.length > 1000) cookedItemIds.splice(0, cookedItemIds.length - 1000);
          localStorage.setItem("cooked_items", JSON.stringify(cookedItemIds));
      }

      setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus } : t)));
      
    } catch (e) {
      setError(e?.message || "Statusni o'zgartirib bo'lmadi");
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
  }, []);

  return (
    <>
      {error && <div className="alert alert-danger mt-3 fw-bold">{error}</div>}

      <div className="d-flex justify-content-end mb-2 pe-3 gap-3" style={{ fontSize: "13px", color: "#64748b" }}>
        <span>🖱️ <b>Chap tugma:</b> Oldinga o'tkazish</span>
        <span>🖱️ <b>O'ng tugma:</b> Orqaga qaytarish</span>
      </div>

      <div className="kds-board">
        {COLS.map((col) => (
          <Column
            key={col.key}
            colKey={col.key}
            title={col.title}
            colColor={col.colColor}
            tickets={grouped[col.key]}
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
        itemsText={selected ? selected.items : []}
        onClose={() => {
          setModalOpen(false);
          setSelected(null);
        }}
      />
    </>
  );
}

function Column({ colKey, title, colColor, tickets, busyMap, onOpen, onChangeStatus }) {
  return (
    <div className="kds-col" data-col={colColor}>
      <div className="kds-col-title fw-bold">{title} <span className="badge bg-secondary ms-2">{tickets.length}</span></div>

      <div className="kds-stack">
        {tickets.map((ticket) => (
          <div 
            key={ticket.id} 
            className={`ticket-card-wrapper border-color-${colColor}`}
            onClick={(e) => {
              e.preventDefault();
              onChangeStatus(ticket, "FORWARD");
            }} 
            onContextMenu={(e) => {
              e.preventDefault(); 
              onChangeStatus(ticket, "BACKWARD");
            }}
            style={{ 
              // Tayyor bo'lgan ustunni bosib bo'lmasligini kursor orqali bildiramiz
              cursor: colColor === "READY" ? "default" : "pointer", 
              transition: "transform 0.1s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = colColor === "READY" ? "scale(1)" : "scale(1.02)"}
            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            <TicketCard
              ticket={{ ...ticket, cssStatus: colColor }}
              busy={!!busyMap[ticket.id]}
              items={ticket.items || []}
              onOpen={onOpen}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
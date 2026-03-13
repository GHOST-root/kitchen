import React, { useEffect, useMemo, useState, useContext } from "react";
import AppHeader from "./AppHeader.jsx";
import TableCard from "./TableCard.jsx";
import { apiGetTables } from "./ofitsantApi.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";

export default function WaiterHome({ onOpenTable }) {
  const { user, logout } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  // Qidiruv va filtr uchun
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Hammasi");

  // --- Modal uchun state'lar ---
  const [selectedTable, setSelectedTable] = useState(null); // Qaysi stol bosildi?
  const [guestsCount, setGuestsCount] = useState(1);        // Mehmonlar soni

  // Qidiruv va filtr orqali stollarni ajratish
  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tables
      .filter(t => filter === "Hammasi" ? true : t.status === filter)
      .filter(t => !s ? true : String(t.number).includes(s));
  }, [tables, q, filter]);

  // Stollarni backenddan yuklash funksiyasi
  function loadTables(signal) {
    apiGetTables({ signal })
      .then((list) => { 
        setTables(list); 
        setErr(""); 
      })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }

  // Birinchi marta sahifa ochilganda stollarni yuklash
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    loadTables(ac.signal);
    return () => ac.abort();
  }, []);

  // Boshqa sahifalardan "tables-refresh" signali kelganda stollarni yangilash
  useEffect(() => {
    window.addEventListener("tables-refresh", loadTables);
    return () => window.removeEventListener("tables-refresh", loadTables);
  }, []);

  // --- Stol bosilganda ishlaydigan mantiq ---
  const handleTableClick = (t) => {
    if (t.status === "Bo‘sh") {
      // Agar bo'sh bo'lsa, mehmonlar sonini so'rash uchun modalni ochamiz
      setSelectedTable(t);
      setGuestsCount(1); // Standart holatda 1 kishi
    } else {
      // Agar band yoki boshqa statusda bo'lsa, to'g'ridan-to'g'ri menyuga kiramiz (mehmonsiz)
      onOpenTable({ id: t.id, number: t.number, guestsCount: null });
    }
  };

  // Modalda "Tasdiqlash" bosilganda
  const handleConfirmGuests = () => {
    if (selectedTable) {
      onOpenTable({ 
        id: selectedTable.id, 
        number: selectedTable.number, 
        guestsCount: guestsCount 
      });
      setSelectedTable(null); // Modalni yopamiz
    }
  };

  return (
    <div className="page position-relative">
      <AppHeader />

      {/* Yuqori qism: Logo va Profil */}
      <div className="d-flex justify-content-between align-items-center p-3 bg-white shadow-sm mb-3">
         <h4 className="m-0 text-primary fw-bold">BAHOR CAFE</h4>
         <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-muted">{user?.username || "Ofitsiant"}</span>
            <button className="btn btn-sm btn-danger" onClick={logout}>Chiqish</button>
         </div>
      </div>

      <div className="page-body container-fluid py-3">
        <div className="cardx p-3 mb-3">
          <div className="row g-2 align-items-center">
            
            {/* Qidiruv qismi */}
            <div className="col-12 col-md-6">
              <div className="smallx muted mb-1">Qidiruv</div>
              <div className="input-group">
                <input
                  className="form-control inputx"
                  placeholder="Stol raqami..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button">🔎</button>
              </div>
            </div>

            {/* Filtr qismi */}
            <div className="col-12 col-md-6">
              <div className="smallx muted mb-1">Filtr</div>
              <div className="d-flex flex-wrap gap-2">
                {["Hammasi", "Bo‘sh", "Band", "Tayyor", "Hisob"].map(x => (
                  <button
                    key={x}
                    className={"chip " + (filter === x ? "chip-busy" : "chip-empty")}
                    onClick={() => setFilter(x)}
                    type="button"
                  >
                    {x}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? <div className="smallx muted mt-2">Stollar yuklanmoqda…</div> : null}
          {err ? <div className="smallx mt-2" style={{ color: "var(--danger)" }}>{err}</div> : null}
        </div>

        {/* Stollar ro'yxati */}
        <div className="row g-3">
          {visible.map(t => (
            <div key={t.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
              <TableCard
                number={t.number}
                status={t.status}
                onClick={() => handleTableClick(t)}   
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- MEHMONLAR SONINI SO'RASH MODALI --- */}
      {selectedTable && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
          style={{ backgroundColor: "rgba(0,0,0,0.5)", zIndex: 1050 }}
        >
          <div className="bg-white p-4 rounded shadow-lg" style={{ width: "320px" }}>
            <div className="text-center mb-3">
              <div className="fs-1">👥</div>
              <h4 className="fw-bold mt-2">Stol {selectedTable.number}</h4>
              <p className="text-muted small">Mehmonlar sonini belgilang:</p>
            </div>
            
            <div className="d-flex justify-content-center align-items-center mb-4 gap-4">
              <button 
                className="btn btn-outline-danger rounded-circle fw-bold d-flex justify-content-center align-items-center" 
                style={{ width: "50px", height: "50px", fontSize: "24px" }}
                onClick={() => setGuestsCount(prev => Math.max(1, prev - 1))}
              >−</button>
              
              <span className="fs-1 fw-bold text-dark">{guestsCount}</span>
              
              <button 
                className="btn btn-outline-success rounded-circle fw-bold d-flex justify-content-center align-items-center" 
                style={{ width: "50px", height: "50px", fontSize: "24px" }}
                onClick={() => setGuestsCount(prev => prev + 1)}
              >+</button>
            </div>

            <div className="d-flex gap-2">
              <button 
                className="btn btn-light flex-grow-1 py-2 fw-bold" 
                onClick={() => setSelectedTable(null)}
              >Bekor qilish</button>
              
              <button 
                className="btn btn-primary flex-grow-1 py-2 fw-bold" 
                onClick={handleConfirmGuests}
              >Tasdiqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
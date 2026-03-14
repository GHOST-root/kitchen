import React, { useEffect, useMemo, useState, useContext } from "react";
import TableCard from "./TableCard.jsx";
import { apiGetTables } from "./ofitsantApi.jsx";
import { AuthContext } from "../../context/AuthContext.jsx";

export default function WaiterHome({ onOpenTable }) {
  const { user, logout } = useContext(AuthContext);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Hammasi");

  const [selectedTable, setSelectedTable] = useState(null); 
  const [guestsCount, setGuestsCount] = useState(1);        

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tables
      .filter(t => filter === "Hammasi" ? true : t.status === filter)
      .filter(t => !s ? true : String(t.number).toLowerCase().includes(s));
  }, [tables, q, filter]);

  function loadTables(signal) {
    apiGetTables({ signal })
      .then((list) => { setTables(list); setErr(""); })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    loadTables(ac.signal);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    window.addEventListener("tables-refresh", loadTables);
    return () => window.removeEventListener("tables-refresh", loadTables);
  }, []);

  const handleTableClick = (t) => {
    if (t.status === "Bo‘sh") {
      setSelectedTable(t);
      setGuestsCount(1); 
    } else {
      onOpenTable({ id: t.id, number: t.number, guestsCount: null });
    }
  };

  const handleConfirmGuests = () => {
    if (selectedTable) {
      onOpenTable({ id: selectedTable.id, number: selectedTable.number, guestsCount: guestsCount });
      setSelectedTable(null); 
    }
  };

  return (
    <div className="ofitsant-page-wrapper">
      
      {/* 1. YANGI, TOZA HEADER (<AppHeader /> o'rniga) */}
      <div className="bg-white shadow-sm mb-4 border-bottom">
         <div className="container-fluid py-3 d-flex justify-content-between align-items-center">
            <h4 className="m-0 text-primary fw-bold" style={{ letterSpacing: "1px" }}>BAHOR CAFE</h4>
            <div className="d-flex align-items-center gap-3">
               <div className="d-none d-sm-block text-end pe-3 border-end">
                 <div className="text-muted" style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase" }}>Ofitsiant</div>
                 <div className="fw-bold text-dark">{user?.username || user?.name || "Kiritilmagan"}</div>
               </div>
               <button className="btn btn-danger fw-bold rounded-pill px-4 shadow-sm" onClick={logout}>Chiqish</button>
            </div>
         </div>
      </div>

      <div className="container-fluid pb-5">
        
        {/* 2. ZAMONAVIY QIDIRUV VA FILTR PANELI */}
        <div className="cardx p-2 p-md-3 mb-4 border-0" style={{ background: "#ffffff" }}>
          <div className="row g-3 align-items-center">
            
            {/* Qidiruv */}
            <div className="col-12 col-md-5 col-lg-4">
              <input
                className="form-control inputx w-100"
                placeholder="🔍 Stol raqami yoki nomi..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ borderRadius: "100px", paddingLeft: "20px" }}
              />
            </div>

            {/* Filtr tugmalari */}
            <div className="col-12 col-md-7 col-lg-8">
               <div className="d-flex flex-wrap gap-2 align-items-center justify-content-md-end">
                  <span className="text-muted small fw-bold me-2 d-none d-lg-block">FILTR:</span>
                  {["Hammasi", "Bo‘sh", "Band", "Tayyor", "Hisob"].map(x => (
                    <button
                      key={x}
                      className={`filter-chip ${filter === x ? 'active' : ''}`}
                      onClick={() => setFilter(x)}
                      type="button"
                    >
                      {x}
                    </button>
                  ))}
               </div>
            </div>
          </div>
        </div>

        {loading && <div className="text-center text-muted fw-bold my-5">Yuklanmoqda...</div>}
        {err && <div className="alert alert-danger shadow-sm border-0 fw-bold">{err}</div>}

        {/* 3. STOLLAR RO'YXATI */}
        <div className="row g-3 g-md-4">
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

      {/* MODAL */}
      {selectedTable && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 1050, backdropFilter: "blur(4px)" }}>
          <div className="bg-white p-4 rounded-4 shadow-lg scale-in" style={{ width: "320px", border: "1px solid #e2e8f0" }}>
            <div className="text-center mb-4">
              <div className="fs-1 mb-2">👥</div>
              <h4 className="fw-bold m-0 text-dark">Stol {String(selectedTable.number).replace(/stol/i, "").trim()}</h4>
              <p className="text-muted small mt-1">Mehmonlar sonini belgilang:</p>
            </div>
            
            <div className="d-flex justify-content-center align-items-center mb-4 gap-4">
              <button className="btn btn-light border rounded-circle fw-bold text-danger shadow-sm d-flex justify-content-center align-items-center" style={{ width: "50px", height: "50px", fontSize: "24px" }} onClick={() => setGuestsCount(prev => Math.max(1, prev - 1))}>−</button>
              <span className="fs-1 fw-bold text-primary">{guestsCount}</span>
              <button className="btn btn-light border rounded-circle fw-bold text-success shadow-sm d-flex justify-content-center align-items-center" style={{ width: "50px", height: "50px", fontSize: "24px" }} onClick={() => setGuestsCount(prev => prev + 1)}>+</button>
            </div>

            <div className="d-flex gap-2 mt-2">
              <button className="btn btn-light border flex-grow-1 py-2 fw-bold text-muted rounded-pill" onClick={() => setSelectedTable(null)}>Bekor qilish</button>
              <button className="btn btn-primaryx flex-grow-1 py-2 fw-bold rounded-pill" onClick={handleConfirmGuests}>Tasdiqlash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
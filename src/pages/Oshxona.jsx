import React, { useEffect, useState, useContext } from "react";
import KitchenBoard from "../components/oshxona/KitchenBoard";
import { AuthContext } from "../context/AuthContext"; // AuthContext ni chaqiramiz
import '../index.css'

function pad2(n){ return String(n).padStart(2,"0"); }

export default function Oshxona() {
  // Context'dan user va logout ni olamiz
  const { user, logout } = useContext(AuthContext); 
  
  const [now, setNow] = useState(new Date());
  const branchId = 1; // kerak bo'lsa keyin select qilasiz

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return (
    <div className="kds-shell">
      <div className="kds-topbar d-flex align-items-center justify-content-between p-3">
        {/* Chap tomon: Sarlavha */}
        <div>
          <div className="kds-title">OSHXONA EKRANI</div>
          <div className="kds-sub">
            Filial: {branchId}
          </div>
        </div>
                                         
        {/* O'ng tomon: Vaqt va Chiqish tugmasi */}
        <div className="d-flex align-items-center gap-4">
          <div className="text-end">
            <div style={{ fontSize: 14, color: "var(--surface)" }}>Sinx: <b className="text-success">Live</b></div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--surface)" }}>
              {timeStr}
            </div>
          </div>

          {/* Profil va Chiqish qismi */}
          <div className="d-flex align-items-center gap-3 border-start ps-4" style={{ borderColor: "var(--border)" }}>
            <span className="fw-bold" style={{ color: "var(--surface)", fontSize: 16 }}>
              {user?.username || user?.name || "Oshpaz"}
            </span>
            <button 
              className="btn btn-danger fw-bold px-3 py-2" 
              onClick={logout}
              style={{ borderRadius: "8px" }}
            >
              Chiqish
            </button>
          </div>
        </div>
      </div>

      <KitchenBoard branchId={branchId} />
    </div>
  );
}
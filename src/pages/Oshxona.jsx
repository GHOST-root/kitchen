import React, { useEffect, useState } from "react";
import KitchenBoard from "../components/oshxona/KitchenBoard";
import '../index.css'

function pad2(n){ return String(n).padStart(2,"0"); }

export default function Oshxona() {
  const [now, setNow] = useState(new Date());
  const branchId = 1; // kerak bo'lsa keyin select qilasiz

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  return (
    <div className="kds-shell">
      <div className="kds-topbar d-flex align-items-center justify-content-between">
        <div>
          <div className="kds-title">OSHXONA EKRANI</div>
          <div className="kds-sub">
            Filial: {branchId}
          </div>
        </div>
                                         
        <div className="kds-right">
          <div>Sinx: <b>Live</b></div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
            {timeStr}
          </div>
        </div>
      </div>

      <KitchenBoard branchId={branchId} />
    </div>
  );
}
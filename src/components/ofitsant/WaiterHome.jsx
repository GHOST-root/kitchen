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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Hammasi");

  const visible = useMemo(() => {
    const s = q.trim().toLowerCase();
    return tables
      .filter(t => filter === "Hammasi" ? true : t.status === filter)
      .filter(t => !s ? true : String(t.number).includes(s));
  }, [tables, q, filter]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    apiGetTables({ signal: ac.signal })
      .then((list) => { setTables(list); setErr(""); })
      .catch((e) => setErr(String(e.message || e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  return (
    <div className="page">
      <AppHeader />

      <div className="d-flex justify-content-between align-items-center p-3 bg-white shadow-sm mb-3">
         <h4 className="m-0 text-primary fw-bold">MODME RESTO</h4>
         <div className="d-flex align-items-center gap-3">
            <span className="fw-bold text-muted">{user?.username}</span>
            <button className="btn btn-sm btn-danger" onClick={logout}>Chiqish</button>
         </div>
      </div>

      <div className="page-body container-fluid py-3">
        <div className="cardx p-3 mb-3">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-6">
              <div className="smallx muted mb-1">Qidiruv</div>
              <div className="input-group">
                <input
                  className="form-control inputx"
                  placeholder="Stol raqami / mijoz nomi / buyurtma ID"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button">🔎</button>
              </div>
            </div>

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

          {loading ? <div className="smallx muted mt-2">Yuklanmoqda…</div> : null}
          {err ? <div className="smallx mt-2" style={{ color: "var(--danger)" }}>{err}</div> : null}
        </div>

        <div className="row g-3">
          {visible.map(t => (
            <div key={t.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
              <TableCard
                number={t.number}
                status={t.status}
                onClick={() => onOpenTable(t.number)}   
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState, useContext } from "react";
import './ofitsantStyles.css'
import { AuthContext } from "../../context/AuthContext.jsx"; 
import {
  apiGetOrCreateOrderByTable,
  apiAddItem,
  apiSendToKitchen,
  apiSetTableBusy,
  apiUpdateOrderGuests
} from "./ofitsantApi.jsx";
import req from "./ofitsantApi.jsx";

function formatUZS(n){
  const s = Math.round(Number(n || 0)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function OrderScreen({ tableData, onBack }) {
  const { user } = useContext(AuthContext); 

  const tableId = tableData.id;
  const guestsCountInitial = tableData.guestsCount;

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");
  
  const [order, setOrder] = useState(null);
  
  // 🔥 ASOSIY O'ZGARISH: Savat endi to'liq local (jo'natilmaguncha bazaga bormaydi)
  const [localCart, setLocalCart] = useState([]);
  const [draftSelection, setDraftSelection] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [toast, setToast] = useState("");

  const [drafts, setDrafts] = useState(() => {
    const saved = localStorage.getItem(`drafts_table_${tableId}`);
    return saved ? JSON.parse(saved) : [];
  });

  // 🔥 1-MUAMMO YECHIMI: Stol o'zgarganda hamma eski statelarni tozalaymiz (aralashib ketmaydi)
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setOrder(null);
    setLocalCart([]);
    setDraftSelection([]);
    setToast("");

    apiGetOrCreateOrderByTable(tableId, guestsCountInitial, { signal: ac.signal })
      .then((o) => setOrder(o))
      .catch((e) => {
        if (e.name !== "AbortError") setToast(String(e.message || e));
      })
      .finally(() => setLoading(false));
      
    return () => ac.abort();
  }, [tableId, guestsCountInitial]);

  useEffect(() => {
    async function loadData() {
      try {
        const cats = await req("/table/category/");
        const prods = await req("/table/product/");
        setCategories(cats);
        setProducts(prods);
        if (cats.length) setActiveCat(cats[0].id);
      } catch (e) {
        console.error("Yuklash xato:", e);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    if (drafts.length > 0) {
      localStorage.setItem(`drafts_table_${tableId}`, JSON.stringify(drafts));
    } else {
      localStorage.removeItem(`drafts_table_${tableId}`);
    }
  }, [drafts, tableId]);

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products
      .filter(p => (activeCat ? p.category === activeCat : true))
      .filter(p => (!s ? true : p.name.toLowerCase().includes(s)));
  }, [products, activeCat, search]);

  // Jami summalarni hisoblash
  const alreadySentItems = order?.items || [];
  const alreadySentTotal = alreadySentItems.reduce((sum, it) => sum + it.price * it.qty, 0);
  const localItemsTotal = localCart.reduce((sum, it) => sum + it.price * it.qty, 0);
  
  const serviceFee = (order?.guestsCount || 1) * 1000;
  const grandTotal = alreadySentTotal + localItemsTotal + serviceFee;

  // 🔥 Mahalliy savatga qo'shish (Backendga darhol bormaydi, judayam tez ishlaydi!)
  function addProduct(p){
    if (!order) return;
    setLocalCart(prev => {
      const ex = prev.find(x => x.productId === p.id);
      if (ex) return prev.map(x => x.productId === p.id ? { ...x, qty: x.qty + 1 } : x);
      return [{ id: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, qty: 1 }, ...prev];
    });
  }

  function changeQty(itemToChange, delta){
    setLocalCart(prev => {
      const nextQty = itemToChange.qty + delta;
      if (nextQty <= 0) return prev.filter(x => x.id !== itemToChange.id);
      return prev.map(x => x.id === itemToChange.id ? { ...x, qty: nextQty } : x);
    });
  }

  async function changeGuests(delta) {
    if (!order) return;
    const currentCount = Number(order.guestsCount) || 1;
    const nextCount = Math.max(1, currentCount + delta);
    setOrder({ ...order, guestsCount: nextCount });
    try {
      await apiUpdateOrderGuests(order.id, nextCount);
    } catch (e) {
      setOrder({ ...order, guestsCount: currentCount });
      setToast("❌ Mehmon soni saqlanmadi");
    }
  }

  function toggleDraftSelect(id) {
    setDraftSelection(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function moveSelectedToDraft() {
    if (draftSelection.length === 0) return;
    const itemsToMove = localCart.filter(it => draftSelection.includes(it.id));
    const nextLocal = localCart.filter(it => !draftSelection.includes(it.id));
    
    setLocalCart(nextLocal);
    
    let newDrafts = [...drafts];
    itemsToMove.forEach(item => {
      const exist = newDrafts.find(d => d.productId === item.productId);
      if (exist) exist.qty += item.qty;
      else newDrafts.unshift({ ...item, id: crypto.randomUUID() });
    });
    
    setDrafts(newDrafts);
    setDraftSelection([]);
  }

  function removeDraft(id) { 
    setDrafts(drafts.filter(x => x.id !== id)); 
  }

  function moveDraftToOrder() {
    const newLocal = [...localCart];
    drafts.forEach(d => {
       const ex = newLocal.find(x => x.productId === d.productId);
       if (ex) ex.qty += d.qty;
       else newLocal.push({ ...d, id: crypto.randomUUID() });
    });
    setLocalCart(newLocal);
    setDrafts([]);
  }

  // 🔥 YUBORISH MANTIG'I (Faqatgina shu yerda backend bilan ishlash bo'ladi)
  async function sendToKitchen() {
    if (!order || localCart.length === 0) return;
    
    setIsSending(true);
    setToast("⏳ Jo'natilmoqda...");
    
    try {
      // 1. Stolni band qilamiz
      await apiSetTableBusy(order.tableNumber).catch(() => {});
      
      // 2. Mahalliy savatdagi (Yangi) taomlarni bazaga saqlaymiz 
      // Promise.all orqali hammasini bittada yuboramiz - tez ishlaydi
      await Promise.all(localCart.map(item => 
        apiAddItem(order.id, item.productId, item.qty)
      ));

      // 3. Statusni oshxonaga yuborilgan deb o'zgartiramiz
      if (order.status !== "sent_to_kitchen" && order.status !== "preparing" && order.status !== "ready") {
        await apiSendToKitchen(order).catch(err => {
          if (!err.message?.includes("allaqachon")) throw err;
        });
      }

      // 4. Muvaffaqiyatli yakun (Savat tozalanadi, ekran orqaga qaytadi)
      setToast("✅ Oshxonaga yuborildi!");
      setLocalCart([]);
      setDraftSelection([]);
      setDrafts([]);
      localStorage.removeItem(`drafts_table_${tableId}`);
      
      window.dispatchEvent(new Event("tables-refresh"));

      setTimeout(() => {
        onBack();
      }, 700);

    } catch (e) {
      setToast("❌ Xatolik yuz berdi");
      console.error(e);
      setIsSending(false); // Xato bo'lsa qayta bosishga ruxsat
    }
  }

  if (loading) return <div className="page p-3 muted d-flex justify-content-center align-items-center h-100 fw-bold fs-5">Yuklanmoqda…</div>;
  if (!order) return <div className="page p-3"><button className="btn btn-outline-secondary" onClick={onBack}>← Orqaga</button></div>;

  return (
    <div className="page">
      {/* HEADER */}
      <div className="bg-white shadow-sm mb-3">
        <div className="container-fluid py-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
          <button className="btn btn-light fw-bold px-4" onClick={onBack}>← Otrqaga</button>
          
          <div className="d-flex flex-wrap gap-4 align-items-center">
            <div className="d-flex align-items-center gap-2 border-end pe-4">
               <span className="fs-3">👨‍🍳</span>
               <div>
                 <div className="text-muted" style={{ fontSize: "0.75rem", fontWeight: "bold", textTransform: "uppercase" }}>Ofitsiant</div>
                 <div className="fw-bold text-dark fs-6">{user?.username || user?.name || "Kiritilmagan"}</div>
               </div>
            </div>

            <div className="d-flex align-items-center gap-2">
              <span className="fs-4 text-primary fw-bold">Stol {order.tableNumber}</span>
              <div className="chip chip-busy ms-2 shadow-sm">Band</div>
            </div>
          </div>
          
          <div className="bg-light px-3 py-2 rounded-3 border">
            <span className="text-muted small fw-bold me-2">BUYURTMA:</span>
            <span className="fw-bold fs-5 text-dark">#{order.code || order.number || "—"}</span>
          </div>
        </div>
      </div>

      <div className="page-body container-fluid pb-4">
        <div className="row g-4">
          
          {/* 1. KATEGORIYALAR */}
          <div className="col-12 col-md-3">
            <div className="cardx p-3 border-0 h-100">
              <div className="h2x mb-3 text-primary">KATEGORIYA</div>
              <input className="form-control inputx mb-3" placeholder="🔎 Qidiruv" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="d-grid gap-2">
                {categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => (
                  <button key={c.id} type="button" 
                    className={`btn text-start fw-bold py-2 ${activeCat === c.id ? "btn-primaryx shadow-sm" : "btn-light text-secondary"}`} 
                    onClick={() => setActiveCat(c.id)}>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. TAOMLAR */}
          <div className="col-12 col-md-5">
            <div className="cardx p-3 border-0 h-100 bg-white">
              <div className="h2x mb-3 text-primary">TAOMLAR</div>
              <div className="row g-3">
                {filteredProducts.map(p => (
                  <div key={p.id} className="col-12 col-xl-6">
                    <div className="cardx p-3 w-100 h-100 d-flex flex-column justify-content-between" style={{ border: "1px solid #e2e8f0" }}>
                      <div className="mb-3">
                        <div className="bodyx fw-bold fs-6 mb-1 text-dark">{p.name}</div>
                        <div className="priceX text-muted">{formatUZS(p.price)}</div>
                      </div>
                      <button className="btn btn-sm btn-primaryx w-100 py-2" onClick={() => addProduct(p)}>+ Savatga</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. SAVAT */}
          <div className="col-12 col-md-4">
            <div className="cardx p-3 border-0 cart-sticky h-100 d-flex flex-column bg-white">
              
              {drafts.length > 0 && (
                <div className="p-3 mb-3" style={{ backgroundColor: "#f0fdfa", borderRadius: "12px", border: "1px dashed #14b8a6" }}>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="small fw-bold text-teal" style={{ color: "#0f766e" }}>📁 KEYINROQ ({drafts.length})</div>
                    <button className="btn btn-sm btn-success fw-bold px-3 py-1" onClick={moveDraftToOrder}>Yuborish</button>
                  </div>
                  <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                    {drafts.map((d, i) => (
                      <div key={d.id || i} className="d-flex justify-content-between align-items-center border-bottom border-light py-2 small fw-bold">
                        <span className="text-dark">{d.name} <span className="text-muted">x{d.qty}</span></span>
                        <button className="btn btn-sm btn-light text-danger rounded-circle p-1" style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => removeDraft(d.id)}>×</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 🔥 ESKI BUYURTMALAR (Oshxonaga yuborib bo'lingan) */}
              {alreadySentItems.length > 0 && (
                <div className="mb-3 px-3 py-2" style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #cbd5e1" }}>
                  <div className="small fw-bold text-secondary mb-2 d-flex align-items-center gap-2">
                    <span>✅</span> OSHXONADA (Oldin yuborilganlar)
                  </div>
                  <div style={{ maxHeight: "110px", overflowY: "auto", paddingRight: "4px" }}>
                    {alreadySentItems.map((it, i) => (
                      <div key={it.id || i} className="d-flex justify-content-between text-muted border-bottom border-light pb-1 mb-1" style={{ fontSize: "13px" }}>
                        <span className="text-truncate pe-2" style={{ maxWidth: "75%" }}>{it.qty}x {it.name}</span>
                        <span className="fw-bold">{formatUZS(it.price * it.qty)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="h2x mb-3 text-primary d-flex align-items-center gap-2">
                YANGI QO'SHILAYOTGANLAR {localCart.length > 0 && <span className="badge bg-danger rounded-pill px-2">{localCart.length}</span>}
              </div>
              
              <div className="list-scroll flex-grow-1 mb-3" style={{maxHeight: "35vh", overflowY: "auto"}}>
                {localCart.length === 0 ? <div className="text-center text-muted py-5 fw-bold">Savat bo‘sh 🛒</div> : (
                  <div className="d-flex flex-column gap-2 pe-1">
                    {localCart.map((it, i) => (
                      <div key={it.id || i} className="cardx p-2 shadow-sm" style={{ border: "1px solid #e2e8f0", backgroundColor: draftSelection.includes(it.id) ? "#f8fafc" : "#fff" }}>
                        <div className="d-flex justify-content-between align-items-center gap-2">
                          
                          <div className="d-flex align-items-center gap-2 text-truncate">
                            <input 
                              type="checkbox" 
                              style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#3b82f6" }}
                              checked={draftSelection.includes(it.id)}
                              onChange={() => toggleDraftSelect(it.id)}
                            />
                            <div className="fw-bold text-truncate text-dark" title={it.name}>
                              {it.name} <span className="text-muted fw-normal ms-1 small">- {formatUZS(it.price)}</span>
                            </div>
                          </div>
                          
                          <div className="d-flex align-items-center gap-2 flex-shrink-0 bg-light rounded-pill p-1 border">
                            <button className="btn btn-sm btn-white rounded-circle shadow-sm fw-bold text-danger" style={{width: 28, height: 28, padding: 0}} onClick={() => changeQty(it, -1)}>−</button>
                            <span className="fw-bold px-1">{it.qty}</span>
                            <button className="btn btn-sm btn-white rounded-circle shadow-sm fw-bold text-success" style={{width: 28, height: 28, padding: 0}} onClick={() => changeQty(it, +1)}>+</button>
                          </div>

                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-top mt-auto">
                {/* Mehmonlar */}
                <div className="d-flex justify-content-between align-items-center mb-2 bg-light p-2 rounded-3 border">
                  <div className="fw-bold text-muted d-flex align-items-center gap-2">
                    <span className="fs-5">👥</span> Mehmonlar
                  </div>
                  <div className="d-flex align-items-center gap-3">
                    <button className="btn btn-sm btn-white border rounded-circle fw-bold shadow-sm" style={{width: 32, height: 32}} onClick={() => changeGuests(-1)}>−</button>
                    <span className="fw-bold fs-5 text-primary">{order.guestsCount || 1}</span>
                    <button className="btn btn-sm btn-white border rounded-circle fw-bold shadow-sm" style={{width: 32, height: 32}} onClick={() => changeGuests(+1)}>+</button>
                  </div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                  <div className="text-muted small fw-bold">Xizmat haqqi:</div>
                  <div className="fw-bold text-muted">{formatUZS(serviceFee)}</div>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                  <div className="h2x m-0 fw-bold">Jami hisob:</div>
                  <div className="priceX fs-4 text-success">{formatUZS(grandTotal)}</div>
                </div>

                {draftSelection.length > 0 && (
                  <button className="btn btn-light w-100 mb-2 fw-bold text-info border-info" style={{ border: "2px solid" }} onClick={moveSelectedToDraft}>
                    📁 Belgilanganlarni keyinroqqa
                  </button>
                )}
                
                <button 
                  className="btn w-100 py-3 fs-5 fw-bold shadow d-flex justify-content-center align-items-center gap-2" 
                  style={{ 
                    borderRadius: "14px", 
                    backgroundColor: localCart.length === 0 || isSending ? "#94a3b8" : "#10b981", 
                    color: "#fff",
                    border: "none",
                    transition: "0.2s"
                  }} 
                  onClick={sendToKitchen}
                  disabled={localCart.length === 0 || isSending}
                >
                  {isSending ? (
                     <span>⏳ Jo'natilmoqda...</span>
                  ) : (
                     <><span>🍳</span> Oshxonaga yuborish</>
                  )}
                </button>
                {toast && <div className="small mt-2 text-center fw-bold text-danger">{toast}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
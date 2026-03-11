import React, { useEffect, useMemo, useState } from "react";
import { apiGetOrCreateOrderByTable, apiAddItem, apiSetQty, apiSendToKitchen } from "./ofitsantApi.jsx";

function formatUZS(n){
  const s = Math.round(Number(n || 0)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export default function OrderScreen({ tableId, menu, onBack }) {
  const tableNumber = tableId;

  const [activeCat, setActiveCat] = useState(menu.categories[0]?.id ?? null);
  const [search, setSearch] = useState("");

  const [order, setOrder] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return menu.products
      .filter(p => activeCat ? p.categoryId === activeCat : true)
      .filter(p => !s ? true : p.name.toLowerCase().includes(s));
  }, [menu.products, activeCat, search]);

  const items = order?.items ?? [];
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find(x => x.id === selectedItemId) || null;
  }, [selectedItemId, items]);

  const [drafts, setDrafts] = useState(() => {
    // LocalStorage'dan mavjud draftlarni yuklash
    const saved = localStorage.getItem(`drafts_table_${tableId}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [undoItem, setUndoItem] = useState(null); // O'chirilgan elementni vaqtincha saqlash
  const [undoTimer, setUndoTimer] = useState(null);

  async function addProduct(p){
    if (!order) return;

    const prev = order;

    // optimistic
    const existed = order.items.find(x => x.productId === p.id);
    const nextItems = existed
      ? order.items.map(x => x.productId === p.id ? { ...x, qty: x.qty + 1 } : x)
      : [{ id: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, qty: 1 }, ...order.items];

    const nextOrder = { ...order, items: nextItems };
    setOrder(nextOrder);

    const sel = existed ? nextItems.find(x => x.productId === p.id) : nextItems[0];
    setSelectedItemId(sel?.id ?? null);

    try {
      await apiAddItem(order.id, p.id, 1);
      setToast("");
    } catch {
      setOrder(prev); // rollback
      setToast("❌ Taom qo‘shilmadi. Qayta urinib ko‘ring.");
    }
  }

  async function changeQty(delta){
    if (!order || !selectedItem) return;

    const prev = order;
    const nextQty = Math.max(0, selectedItem.qty + delta);

    // optimistic
    const nextItems =
      nextQty === 0
        ? order.items.filter(x => x.id !== selectedItem.id)
        : order.items.map(x => x.id === selectedItem.id ? { ...x, qty: nextQty } : x);

    setOrder({ ...order, items: nextItems });
    if (nextQty === 0) setSelectedItemId(nextItems[0]?.id ?? null);

    try {
      await apiSetQty(order.id, selectedItem.productId, nextQty);
      setToast("");
    } catch {
      setOrder(prev);
      setToast("❌ Miqdor o‘zgarmadi. Qayta urinib ko‘ring.");
    }
  }

  async function sendToKitchen(){
    if (!order) return;

    // UI darhol tozalansin
    const prev = order;
    setOrder({ ...order, items: [] });
    setSelectedItemId(null);

    try {
      await apiSendToKitchen(order.id);
      setToast("✅ Oshxonaga yuborildi");
    } catch {
      setOrder(prev); // rollback
      setToast("❌ Oshxonaga yuborilmadi, qayta urinib ko‘ring");
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    apiGetOrCreateOrderByTable(tableNumber, { signal: ac.signal })
      .then((o) => {
        setOrder(o);
        setSelectedItemId(o.items?.[0]?.id ?? null);
        setToast("");
      })
      .catch((e) => setToast(String(e.message || e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [tableNumber]);

  // Draftlarni saqlash
  useEffect(() => {
    localStorage.setItem(`drafts_table_${tableId}`, JSON.stringify(drafts));
  }, [drafts, tableId]);

  // Draftga qo'shish
  function addToDraft(p) {
    const existed = drafts.find(x => x.productId === p.id);
    if (existed) {
      setDrafts(drafts.map(x => x.productId === p.id ? { ...x, qty: x.qty + 1 } : x));
    } else {
      setDrafts([{ id: crypto.randomUUID(), productId: p.id, name: p.name, price: p.price, qty: 1 }, ...drafts]);
    }
    setToast("📁 Keyinroq jildiga qo'shildi");
  }

  // Draftni o'chirish (10 soniya kutish bilan)
  function removeDraft(id) {
    const itemToRemove = drafts.find(x => x.id === id);
    setUndoItem(itemToRemove);
    setDrafts(drafts.filter(x => x.id !== id));

    // 10 soniyalik taymer
    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => {
      setUndoItem(null);
    }, 10000);
    setUndoTimer(timer);
    setToast("🗑 O'chirildi. Qaytarish uchun 10 soniya bor.");
  }

  // O'chirishni bekor qilish (Undo)
  function undoDelete() {
    if (undoItem) {
      setDrafts([undoItem, ...drafts]);
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
      setToast("🔙 Qaytarildi");
    }
  }

  // Draftdagilarni asosiy buyurtmaga o'tkazish
  async function moveDraftToOrder() {
    for (const d of drafts) {
      await apiAddItem(order.id, d.productId, d.qty);
    }
    setDrafts([]);
    // Sahifani yangilash yoki order state'ni update qilish
    window.location.reload(); 
  }

  if (loading) {
    return (
      <div className="page">
        <div className="cardx" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
          <div className="container-fluid py-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={onBack} type="button">← Orqaga</button>
          </div>
        </div>
        <div className="container-fluid py-3 smallx muted">Order yuklanmoqda…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <div className="container-fluid py-3">
          <button className="btn btn-outline-secondary" onClick={onBack} type="button">← Orqaga</button>
          <div className="smallx mt-2" style={{ color: "var(--danger)" }}>{toast || "Order topilmadi"}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header qismi o'zgarishsiz qoladi */}
      <div className="cardx" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
        <div className="container-fluid py-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={onBack} type="button">← Orqaga</button>
            <div className="bodyx d-flex flex-wrap gap-3 align-items-center">
              <div><b>Stol:</b> {order.tableNumber}</div>
              <div><b>Status:</b> Band</div>
            </div>
            <div className="bodyx d-flex align-items-center gap-2">
              <b>Buyurtma:</b> #{order.code}
            </div>
          </div>
        </div>
      </div>

      <div className="page-body container-fluid py-3">
        <div className="row g-3">
          
          {/* 1. KATEGORIYALAR */}
          <div className="col-12 col-md-3">
            <div className="cardx p-3">
              <div className="h2x mb-2">KATEGORIYA</div>
              <input className="form-control inputx mb-2" placeholder="🔎 Qidiruv" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="d-grid gap-2">
                {menu.categories.map(c => (
                  <button key={c.id} type="button" className={"btn text-start " + (activeCat === c.id ? "btn-primaryx" : "btn-outline-secondary")} onClick={() => setActiveCat(c.id)}>
                    • {c.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 2. TAOMLAR RO'YXATI */}
          <div className="col-12 col-md-6">
            <div className="cardx p-3">
              <div className="h2x mb-2">TAOMLAR</div>
              <div className="row g-2">
                {filteredProducts.map(p => (
                  <div key={p.id} className="col-12 col-sm-6">
                    <div className="cardx p-3 w-100">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <div className="bodyx fw-bold">{p.name}</div>
                          <div className="smallx muted">{p.desc}</div>
                        </div>
                        <div className="priceX">{formatUZS(p.price)}</div>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-primaryx flex-grow-1" onClick={() => addProduct(p)}>Hozir</button>
                        <button className="btn btn-sm btn-outline-info" onClick={() => addToDraft(p)}>📁 Keyinroq</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. SAVAT (CART) VA KEYINROQ JILDI */}
          <div className="col-12 col-md-3">
            <div className="cardx p-3 cart-sticky cart-mobile-height">
              
              {/* --- KEYINROQ JILDI (YANGI) --- */}
              <div className="p-2 mb-3" style={{ border: "2px dashed #0dcaf0", borderRadius: "12px", background: "#f0f9ff" }}>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <div className="smallx fw-bold text-info">📁 KEYINROQ ({drafts.length})</div>
                  {drafts.length > 0 && (
                    <button className="btn btn-sm btn-info text-white py-0" onClick={moveDraftToOrder}>Yuborish</button>
                  )}
                </div>
                <div style={{ maxHeight: "120px", overflowY: "auto" }}>
                  {drafts.map(d => (
                    <div key={d.id} className="d-flex justify-content-between align-items-center border-bottom py-1 smallx">
                      <span>{d.name} x{d.qty}</span>
                      <button className="btn btn-sm p-0 text-danger" onClick={() => removeDraft(d.id)}>×</button>
                    </div>
                  ))}
                </div>
                {undoItem && (
                  <button className="btn btn-sm btn-warning w-100 mt-2 py-1" onClick={undoDelete}>↩ Qaytarish (10s)</button>
                )}
              </div>

              <div className="h2x mb-2">ASOSIY SAVAT</div>
              <div className="list-scroll">
                {items.length === 0 ? <div className="smallx muted py-3">Cart bo‘sh</div> : (
                  <div className="d-flex flex-column gap-2">
                    {items.map(it => (
                      <button key={it.id} type="button" onClick={() => setSelectedItemId(it.id)} className="cardx p-2 text-start" style={{ borderColor: selectedItemId === it.id ? "var(--primary)" : "var(--border)" }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="bodyx fw-bold">{it.name}</div>
                          <div className="bodyx fw-bold">x{it.qty}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Jami va Action tugmalari */}
              <div className="mt-2 pt-2 border-top">
                <div className="d-flex justify-content-between mb-2">
                  <div className="bodyx fw-bold">Jami:</div>
                  <div className="priceX">{formatUZS(total)}</div>
                </div>
                <div className="qtybox mb-2">
                  <button className="btn btn-outline-secondary" onClick={() => changeQty(-1)} disabled={!selectedItem}>−</button>
                  <div className="qtynum">{selectedItem ? selectedItem.qty : 0}</div>
                  <button className="btn btn-primaryx" onClick={() => changeQty(+1)} disabled={!selectedItem}>+</button>
                </div>
                <button className="btn btn-primaryx w-100 py-2" onClick={sendToKitchen}>🍳 Oshxonaga yuborish</button>
                {toast && <div className="smallx mt-2 text-center">{toast}</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useMemo, useState } from "react";
import {
  apiGetOrCreateOrderByTable,
  apiAddItem,
  apiSetQty,
  apiSendToKitchen,
  apiSetTableBusy
} from "./ofitsantApi.jsx";
import req from "./ofitsantApi.jsx";

function formatUZS(n){
  const s = Math.round(Number(n || 0)).toString();
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

// O'tgan safargi tableData (Modal orqali keladigan ma'lumot) ni qabul qilamiz
export default function OrderScreen({ tableData, onBack }) {
  const tableId = tableData.id;
  const tableNumber = tableData.number;
  const guestsCount = tableData.guestsCount;
  const [draftSelection, setDraftSelection] = useState([]); // Belgilangan taomlar ID lari

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [activeCat, setActiveCat] = useState(null);
  const [search, setSearch] = useState("");

  const [order, setOrder] = useState(null);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return products
      .filter(p => (activeCat ? p.category === activeCat : true))
      .filter(p => (!s ? true : p.name.toLowerCase().includes(s)));
  }, [products, activeCat, search]);

  const items = order?.items ?? [];
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find(x => x.id === selectedItemId) || null;
  }, [selectedItemId, items]);

  const [drafts, setDrafts] = useState(() => {
    const saved = localStorage.getItem(`drafts_table_${tableId}`);
    return saved ? JSON.parse(saved) : [];
  });
  
  const [undoItem, setUndoItem] = useState(null);
  const [undoTimer, setUndoTimer] = useState(null);

  // Kategoriyalar va mahsulotlarni yuklash
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

  // Buyurtmani yuklash (guestsCount bilan)
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    apiGetOrCreateOrderByTable(tableId, guestsCount, { signal: ac.signal })
      .then((o) => {
        setOrder(o);
        setSelectedItemId(o.items?.[0]?.id ?? null);
        setToast("");
      })
      .catch((e) => setToast(String(e.message || e)))
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [tableId, guestsCount]);

  // Draftlarni saqlash
  useEffect(() => {
    localStorage.setItem(`drafts_table_${tableId}`, JSON.stringify(drafts));
  }, [drafts, tableId]);

  // --- TAOM QO'SHISH (Optimistic UI ulanishi bilan) ---
  async function addProduct(p){
    if (!order) return;

    const prev = order;
    const existed = order.items.find(x => x.productId === p.id);
    const tempId = crypto.randomUUID(); 
    
    const nextItems = existed
      ? order.items.map(x => x.productId === p.id ? { ...x, qty: x.qty + 1 } : x)
      : [{ id: tempId, productId: p.id, name: p.name, price: p.price, qty: 1 }, ...order.items];

    setOrder({ ...order, items: nextItems });

    const sel = existed ? nextItems.find(x => x.productId === p.id) : nextItems[0];
    setSelectedItemId(sel?.id ?? null);

    try {
      await apiAddItem(order.id, p.id, 1);
      setToast("");

      // Backenddan yangi ID larni olish uchun darhol yangilaymiz
      const updatedOrder = await apiGetOrCreateOrderByTable(tableId, guestsCount);
      setOrder(updatedOrder);

      if (!existed) {
        const addedItem = updatedOrder.items.find(x => x.productId === p.id);
        if (addedItem) setSelectedItemId(addedItem.id);
      }
    } catch (error) {
      console.error(error);
      setOrder(prev); 
      setToast("❌ Taom qo‘shilmadi. Qayta urinib ko‘ring.");
    }
  }

  async function moveSelectedToDraft() {
    if (draftSelection.length === 0 || !order) return;

    // 1. O'tkazilishi kerak bo'lgan taomlarni topamiz
    const itemsToMove = order.items.filter(it => draftSelection.includes(it.id));
    const prevOrder = order;

    // 2. Savatdan (UI) olib tashlaymiz
    const nextItems = order.items.filter(it => !draftSelection.includes(it.id));
    setOrder({ ...order, items: nextItems });

    // 3. Draftlarga qo'shamiz
    let newDrafts = [...drafts];
    itemsToMove.forEach(item => {
      const exist = newDrafts.find(d => d.productId === item.productId);
      if (exist) {
        exist.qty += item.qty;
      } else {
        newDrafts.unshift({ id: crypto.randomUUID(), productId: item.productId, name: item.name, price: item.price, qty: item.qty });
      }
    });
    setDrafts(newDrafts);
    setDraftSelection([]); // Belgilanganlarni tozalab tashlaymiz

    // 4. Backenddan o'chiramiz
    try {
      await Promise.all(itemsToMove.map(item => 
        req(`/order/order-items/${item.id}/`, { method: "DELETE" })
      ));
      setToast("📁 Tanlangan taomlar keyinroqqa olib qo'yildi");
    } catch (e) {
      setOrder(prevOrder); // Xato bo'lsa orqaga qaytaramiz
      setToast("❌ O'tkazishda xatolik yuz berdi");
    }
  }

  // --- MIQDORNI O'ZGARTIRISH ---
  async function changeQty(delta){
    if (!order || !selectedItem) return;

    const prev = order;
    const nextQty = Math.max(0, selectedItem.qty + delta);

    const nextItems = nextQty === 0
        ? order.items.filter(x => x.id !== selectedItem.id)
        : order.items.map(x => x.id === selectedItem.id ? { ...x, qty: nextQty } : x);

    setOrder({ ...order, items: nextItems });
    if (nextQty === 0) setSelectedItemId(nextItems[0]?.id ?? null);

    try {
      if (nextQty === 0) {
        await req(`/order/order-items/${selectedItem.id}/`, { method: "DELETE" });
      } else {
        await apiSetQty(selectedItem.id, nextQty);
      }
      setToast("");
    } catch {
      setOrder(prev);
      setToast("❌ Miqdor o‘zgarmadi. Qayta urinib ko‘ring.");
    }
  }

  // --- SAVATDAN KEYINROQ JILDIGA O'TKAZISH ---
  async function moveItemToDraft() {
    if (!order || !selectedItem) return;

    const itemToMove = selectedItem;
    const prevOrder = order;

    // 1. Savatdan olib tashlaymiz
    const nextItems = order.items.filter(x => x.id !== itemToMove.id);
    setOrder({ ...order, items: nextItems });
    setSelectedItemId(nextItems[0]?.id ?? null);

    // 2. Draftga qo'shamiz
    const existedDraft = drafts.find(x => x.productId === itemToMove.productId);
    if (existedDraft) {
      setDrafts(drafts.map(x => x.productId === itemToMove.productId ? { ...x, qty: x.qty + itemToMove.qty } : x));
    } else {
      setDrafts([{ id: crypto.randomUUID(), productId: itemToMove.productId, name: itemToMove.name, price: itemToMove.price, qty: itemToMove.qty }, ...drafts]);
    }

    // 3. Backenddan o'chiramiz (savatdan ketishi uchun)
    try {
      await req(`/order/order-items/${itemToMove.id}/`, { method: "DELETE" });
      setToast("📁 Taom keyinroqqa olib qo'yildi");
    } catch (e) {
      setOrder(prevOrder);
      setToast("❌ O'tkazishda xatolik yuz berdi");
    }
  }

  // --- OSHXONAGA YUBORISH ---
  async function sendToKitchen() {
    if (!order) return;
    setOrder({ ...order, items: [] });
    setSelectedItemId(null);
    setToast("✅ Oshxonaga yuborildi");
    apiSetTableBusy(order.tableNumber).catch(console.log);
    window.dispatchEvent(new Event("tables-refresh"));
    apiSendToKitchen(order).catch(console.log);
  }

  // --- DRAFT (KEYINROQ) MANTIG'I ---
  function removeDraft(id) {
    const itemToRemove = drafts.find(x => x.id === id);
    setUndoItem(itemToRemove);
    setDrafts(drafts.filter(x => x.id !== id));
    if (undoTimer) clearTimeout(undoTimer);
    const timer = setTimeout(() => { setUndoItem(null); }, 10000);
    setUndoTimer(timer);
    setToast("🗑 O'chirildi. Qaytarish uchun 10 soniya bor.");
  }

  function undoDelete() {
    if (undoItem) {
      setDrafts([undoItem, ...drafts]);
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
      setToast("🔙 Qaytarildi");
    }
  }

  function toggleDraftSelect(id) {
    setDraftSelection(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  async function moveDraftToOrder() {
    if (!order) return;
    for (const d of drafts) {
      await apiAddItem(order.id, d.productId, d.qty);
    }
    setDrafts([]);
    const updated = await apiGetOrCreateOrderByTable(tableId, guestsCount);
    setOrder(updated);
    setToast("✅ Draftlar savatga o'tdi");
  }

  if (loading) {
    return (
      <div className="page">
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
      <div className="cardx" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0 }}>
        <div className="container-fluid py-2">
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={onBack} type="button">← Orqaga</button>
            <div className="bodyx d-flex flex-wrap gap-3 align-items-center">
              <div><b>Stol:</b> {order.tableNumber}</div>
              <div><b>Status:</b> Band</div>
            </div>
            <div className="bodyx d-flex align-items-center gap-2">
              <b>Buyurtma:</b> #{order.code || order.number || "—"}
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
              <input
                className="form-control inputx mb-2"
                placeholder="🔎 Qidiruv"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="d-grid gap-2">
                {categories
                  .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
                  .map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={"btn text-start " + (activeCat === c.id ? "btn-primaryx" : "btn-outline-secondary")}
                      onClick={() => setActiveCat(c.id)}
                    >
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
                        {/* Faqat bitta tugma qoldi */}
                        <button className="btn btn-sm btn-primaryx flex-grow-1" onClick={() => addProduct(p)}>
                          + Savatga qo'shish
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. SAVAT VA KEYINROQ JILDI */}
          <div className="col-12 col-md-3">
            <div className="cardx p-3 cart-sticky cart-mobile-height">
              
              {/* KEYINROQ JILDI */}
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
                {items.length === 0 ? <div className="smallx muted py-3">Savat bo‘sh</div> : (
                  <div className="d-flex flex-column gap-2">
                    {items.map(it => (
                      <div key={it.id} className="cardx p-2 text-start d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          {/* Yangi qo'shilgan checkbox */}
                          <input 
                            type="checkbox" 
                            style={{ width: "18px", height: "18px" }}
                            checked={draftSelection.includes(it.id)}
                            onChange={() => toggleDraftSelect(it.id)}
                          />
                          {/* Taom nomi ustiga bossa, oddiy tanlash (selectedItem) ishlashi uchun */}
                          <div className="bodyx fw-bold" style={{ cursor: "pointer" }} onClick={() => setSelectedItemId(it.id)}>
                            {it.name}
                          </div>
                        </div>
                        <div className="bodyx fw-bold">x{it.qty}</div>
                      </div>
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

                {/* --- YANGI QO'SHILGAN TUGMA --- */}
                {selectedItem && (
                  <button className="btn btn-outline-info w-100 mb-2 py-1 fw-bold" onClick={moveItemToDraft}>
                    📁 Keyinroqqa olib qo'yish
                  </button>
                )}

                {draftSelection.length > 0 && (
                    <button className="btn btn-outline-info w-100 mb-2 py-1 fw-bold" onClick={moveSelectedToDraft}>
                      📁 Belgilanganlarni keyinroqqa ({draftSelection.length})
                    </button>
                  )}

                <button className="btn btn-primaryx w-100 py-2" onClick={sendToKitchen}>🍳 Oshxonaga yuborish</button>
                {toast && <div className="smallx mt-2 text-center text-success">{toast}</div>}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
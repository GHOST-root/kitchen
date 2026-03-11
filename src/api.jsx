import React, { useEffect, useMemo, useState } from "react";


  BASE="https://program90.pythonanywhere.com/api"

const BASE = "/api";

async function getList(path, { signal } = {}) {
  const r = await fetch(BASE + path, { headers: { Accept: "application/json" }, signal });
  if (!r.ok) throw new Error(`HTTP ${r.status} GET ${path}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data?.results || []); 
}

function isoDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function pickDate(order) {
  return order.created_at || order.created || order.createdAt || order.time || order.datetime;
}

function pickStatus(order) {
  return (order.status || order.state || "").toString().toUpperCase();
}

function pickTable(order) {
  return order.table_number ?? order.table ?? order.tableNo ?? order.table_id ?? "-";
}

function pickBranchId(x) {
  return x.branch_id ?? x.branch ?? x.branchId ?? x.branch?.id ?? null;
}

function moneyFromItem(it) {
  const qty = Number(it.qty ?? it.quantity ?? 0);
  const price = Number(it.price ?? it.unit_price ?? it.unitPrice ?? 0);
  return qty * price;
}

export default function App() {
  // UI shart emas, lekin filter uchun state kerak
  const [datePreset, setDatePreset] = useState("today"); // "today" | "week" | "month" (xohlasangiz)
  const [branch, setBranch] = useState("all"); // "all" yoki branch_id

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [branches, setBranches] = useState([]);
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [tickets, setTickets] = useState([]);

  // ✅ API dan hamma kerakli datani olish
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const [b, t, o, it, p, kt] = await Promise.all([
          getList("/branch/", { signal: ac.signal }).catch(() => []), // bo'lmasa ham ishlasin
          getList("/table/", { signal: ac.signal }),
          getList("/order/", { signal: ac.signal }),
          getList("/orderitem/", { signal: ac.signal }),
          getList("/product/", { signal: ac.signal }),
          getList("/kitchenticket/", { signal: ac.signal }),
        ]);

        setBranches(b);
        setTables(t);
        setOrders(o);
        setItems(it);
        setProducts(p);
        setTickets(kt);
      } catch (e) {
        setErr(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  // ✅ branch filter (agar orderlarda branch bo'lsa)
  const filteredOrders = useMemo(() => {
    if (branch === "all") return orders;
    return orders.filter((o) => String(pickBranchId(o)) === String(branch));
  }, [orders, branch]);

  // ✅ datePreset filter (minimal: today)
  const filteredOrdersByDate = useMemo(() => {
    if (datePreset !== "today") return filteredOrders; // xohlasangiz week/month qo'shamiz
    const today = isoDate(new Date());
    return filteredOrders.filter((o) => {
      const d = pickDate(o);
      if (!d) return false;
      return isoDate(d) === today;
    });
  }, [filteredOrders, datePreset]);

  // ✅ OrderItemlarni orderga bog‘lash (order_id fieldlari turli bo‘lishi mumkin)
  const itemsForOrders = useMemo(() => {
    const ids = new Set(filteredOrdersByDate.map((o) => String(o.id ?? o.pk)));
    return items.filter((it) => {
      const oid = it.order_id ?? it.order ?? it.order?.id ?? it.orderId;
      if (oid == null) return false;
      return ids.has(String(oid));
    });
  }, [items, filteredOrdersByDate]);

  // ================= DASHBOARD HISOB-KITOB =================

  // 1) KPI: Savdo, Buyurtma, O'rtacha чек, Foyda (foyda bo'lmasa 0)
  const kpis = useMemo(() => {
    const ordersCount = filteredOrdersByDate.length;

    const sales = itemsForOrders.reduce((s, it) => s + moneyFromItem(it), 0);

    const avgCheck = ordersCount ? Math.round(sales / ordersCount) : 0;

    // foyda uchun backendda cost bo'lmasa 0 qilib turamiz
    const profit = 0;

    return { sales, orders: ordersCount, avgCheck, profit };
  }, [filteredOrdersByDate, itemsForOrders]);

  // 2) Grafik: Kunlik savdo (line) — oxirgi 7 kun (oddiy)
  const salesTrend = useMemo(() => {
    const map = new Map(); // date -> sum
    const last7 = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return isoDate(d);
    });
    last7.forEach((d) => map.set(d, 0));

    // orderitemsni orderdate bo'yicha qo'shamiz
    const orderDateById = new Map();
    for (const o of filteredOrders) {
      const id = String(o.id ?? o.pk);
      const d = pickDate(o);
      if (d) orderDateById.set(id, isoDate(d));
    }

    for (const it of items) {
      const oid = it.order_id ?? it.order ?? it.order?.id ?? it.orderId;
      if (oid == null) continue;
      const d = orderDateById.get(String(oid));
      if (!d || !map.has(d)) continue;
      map.set(d, map.get(d) + moneyFromItem(it));
    }

    return last7.map((d) => ({ date: d, sales: map.get(d) || 0 }));
  }, [filteredOrders, items]);

  // 3) Grafik: Buyurtmalar vaqti (bar) — bugun soat bo‘yicha
  const ordersByTime = useMemo(() => {
    const hours = Array.from({ length: 24 }).map((_, h) => ({ hour: h, count: 0 }));
    for (const o of filteredOrdersByDate) {
      const d = pickDate(o);
      if (!d) continue;
      const h = new Date(d).getHours();
      hours[h].count += 1;
    }
    return hours;
  }, [filteredOrdersByDate]);

  // 4) Jonli holat: Oshxona yuklamasi / Kassadagi holat
  const liveStatus = useMemo(() => {
    // oshxona yuklamasi: ticket statusga qarab (field nomi farq qilishi mumkin)
    const kitchenPrep = tickets.filter((t) => {
      const s = (t.status || t.state || "").toString().toUpperCase();
      return ["PREP", "COOKING", "IN_PROGRESS", "ACTIVE"].includes(s);
    }).length;

    const kitchenLate = tickets.filter((t) => {
      const s = (t.status || t.state || "").toString().toUpperCase();
      return ["LATE", "DELAYED"].includes(s);
    }).length;

    // kassadagi holat: open orders (PAID bo'lmaganlar)
    const openOrders = filteredOrders.filter((o) => {
      const s = pickStatus(o);
      return s !== "PAID" && s !== "CLOSED" && s !== "DONE";
    }).length;

    return {
      kitchen: { preparing: kitchenPrep, late: kitchenLate },
      cashier: { openOrders, todaySales: kpis.sales },
    };
  }, [tickets, filteredOrders, kpis.sales]);

  // 5) Top taomlar: orderitem product_id bo‘yicha
  const topProducts = useMemo(() => {
    const m = new Map(); // pid -> qty
    for (const it of itemsForOrders) {
      const pid = it.product_id ?? it.product ?? it.product?.id ?? it.productId;
      if (!pid) continue;
      const qty = Number(it.qty ?? it.quantity ?? 0);
      m.set(String(pid), (m.get(String(pid)) || 0) + qty);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pid, qty]) => {
        const p = products.find((x) => String(x.id) === String(pid));
        return { product_id: pid, name: p?.name ?? `#${pid}`, qty };
      });
  }, [itemsForOrders, products]);

  // 6) So‘nggi buyurtmalar: oxirgilar 5 ta
  const recentOrders = useMemo(() => {
    const sorted = [...filteredOrders].sort((a, b) => {
      const da = new Date(pickDate(a) || 0).getTime();
      const db = new Date(pickDate(b) || 0).getTime();
      return db - da;
    });
    return sorted.slice(0, 5).map((o) => ({
      id: o.id ?? o.pk,
      table: pickTable(o),
      status: pickStatus(o) || "-",
      created_at: pickDate(o) || null,
    }));
  }, [filteredOrders]);

  // ✅ NATIJA: tayyor dashboard data (console + return object)
  const dashboardData = useMemo(
    () => ({ kpis, salesTrend, ordersByTime, liveStatus, topProducts, recentOrders }),
    [kpis, salesTrend, ordersByTime, liveStatus, topProducts, recentOrders]
  );

  useEffect(() => {
    if (!loading && !err) {
      console.log("DASHBOARD DATA:", dashboardData);
    }
  }, [loading, err, dashboardData]);

  // UI kerak emas dedingiz — shuning uchun hech narsa chizmaymiz
  // xohlasangiz faqat err/loading ko'rinsin:
  if (loading) return null;
  if (err) {
    console.error("API ERROR:", err);
    return null;
  }
  return null;
}

/**
 * ✅ DEV CORS bo'lsa vite.config.js proxy:
 *
 * import { defineConfig } from "vite";
 * import react from "@vitejs/plugin-react";
 * export default defineConfig({
 *   plugins:[react()],
 *   server:{ proxy:{ "/api":{ target:"https://program90.pythonanywhere.com", changeOrigin:true, secure:true } } }
 * });
 */
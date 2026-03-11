import React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

// import { fetchDashboardReal } from "./api.jsx";
 
const UI = {
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
  positive: "#16A34A",
  warning: "#F59E0B",
  danger: "#DC2626",
  info: "#2563EB",
  font: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
};


/* =========================
   2) FORMAT
========================= */
const uzNumber = new Intl.NumberFormat("uz-UZ");
const uzCurrency = new Intl.NumberFormat("uz-UZ", {
  style: "currency",
  currency: "UZS",
  maximumFractionDigits: 0,
});

function formatCompactUZS(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${Math.round((n / 1_000_000) * 10) / 10} mln`;
  return uzNumber.format(n);
}

/* =========================
   4) SMALL UI PIECES
========================= */
function Card({ children, onClick, ariaLabel, style }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      role={clickable ? "button" : "region"}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? ariaLabel : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        background: UI.surface,
        border: `1px solid ${UI.border}`,
        borderRadius: 16,
        boxShadow: "0 1px 0 rgba(15,23,42,0.03)",
        ...style,
        cursor: clickable ? "pointer" : "default",
      }}
    >
      {children}
    </div>
  );
}

function Skeleton({ h = 14, w = "100%", r = 12, mt = 0 }) {
  return (
    <div
      style={{
        height: h,
        width: w,
        borderRadius: r,
        marginTop: mt,
        background: UI.border,
        animation: "pulse 1.1s ease-in-out infinite",
      }}
    />
  );
}

function SectionTitle({ children, right }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          fontSize: 16,
          lineHeight: "24px",
          fontWeight: 600,
          color: UI.text,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={typeof children === "string" ? children : undefined}
      >
        {children}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </div>
  );
}

function Button({ children, onClick, variant = "ghost" }) {
  const isDanger = variant === "danger";
  return (
    <button
      onClick={onClick}
      style={{
        height: 36,
        padding: "0 12px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${isDanger ? UI.danger : UI.border}`,
        background: isDanger ? UI.danger : UI.surface,
        color: isDanger ? "#fff" : UI.text,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

/* =========================
   5) MODAL (Router o‘rniga drill-down)
========================= */
function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
        zIndex: 50,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 100%)",
          background: UI.surface,
          border: `1px solid ${UI.border}`,
          borderRadius: 18,
          padding: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: UI.text,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </div>
          <Button onClick={onClose}>Yopish</Button>
        </div>
        <div
          style={{
            marginTop: 12,
            color: UI.text,
            fontSize: 13,
            lineHeight: "18px",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

/* =========================
   6) MAIN APP
========================= */
export default function Dashboard() {
  const [datePreset, setDatePreset] = useState("today");
  const [branch, setBranch] = useState("all");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [modal, setModal] = useState({ open: false, title: "", content: null });

  const abortRef = useRef(null);

  const load = async () => {
    abortRef.current?.abort?.();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    console.log("Loading data...");

    try {
      // const res = await fetchDashboardReal({
      //   datePreset,
      //   branch,
      //   signal: ac.signal,
      // });
      setData(res);
      console.log(res);
      
    } catch (e) {
      console.log("API ERROR:", e?.message || e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [datePreset, branch]);

  // auto-refresh: 15s
  useEffect(() => {
    const t = setInterval(() => load(), 15000);
    return () => clearInterval(t);
  }, [datePreset, branch]);

  const safe =
    data ?? {
      meta: { adminName: "—", live: false },
      kpi: {
        sales: 0,
        salesDelta: 0,
        orders: 0,
        ordersDelta: 0,
        avgCheck: 0,
        avgCheckDelta: 0,
        profit: 0,
        profitDelta: 0,
        canSeeProfit: false,
      },
      charts: { salesDaily: [], ordersByHour: [] },
      live: {
        kitchen: { preparing: 0, delayed: 0 },
        cashier: { openOrders: 0, todayRevenue: 0 },
      },
      topFoods: [],
      lastOrders: [],
    };

  const kpi = safe.kpi;
  const live = safe.live;

  const delayed = live?.kitchen?.delayed ?? 0;
  const hasDelays = delayed > 0;

  const openDrill = (title, content) =>
    setModal({ open: true, title, content });

  const gridKpiStyle = useMemo(
    () => ({
      display: "grid",
      gap: 12,
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    }),
    []
  );

  const grid2Style = useMemo(
    () => ({
      display: "grid",
      gap: 12,
      gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    }),
    []
  );

  return (
    <div style={{ background: UI.bg, minHeight: "100vh", fontFamily: UI.font }}>
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: 12 }}>
        {/* HEADER */}
        <Card style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>📊</span>
                <div
                  style={{
                    fontSize: 16,
                    lineHeight: "24px",
                    fontWeight: 700,
                    color: UI.text,
                  }}
                >
                  Dashboard
                </div>
              </div>
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  lineHeight: "18px",
                  color: UI.muted,
                }}
              >
                Admin:{" "}
                <span style={{ color: UI.text, fontWeight: 600 }}>
                  {safe?.meta?.adminName ?? "—"}
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                justifyContent: "flex-end",
              }}
            >
              <Select
                label="Bugun"
                value={datePreset}
                onChange={setDatePreset}
                options={[
                  { value: "today", label: "Bugun" },
                  { value: "yesterday", label: "Kecha" },
                  { value: "week", label: "Hafta" },
                  { value: "month", label: "Oy" },
                ]}
              />

              <Select
                label="Filial"
                value={branch}
                onChange={setBranch}
                options={[
                  { value: "all", label: "Barchasi" },
                  { value: "1", label: "Filial 1" },
                  { value: "2", label: "Filial 2" },
                ]}
              />

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "0 10px",
                  height: 40,
                  borderRadius: 12,
                  border: `1px solid ${UI.border}`,
                  background: UI.surface,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 99,
                    background: safe?.meta?.live ? UI.positive : UI.muted,
                  }}
                />
                <div style={{ fontSize: 13, color: UI.muted }}>
                  Sinx:{" "}
                  <span style={{ color: UI.text, fontWeight: 700 }}>
                    {safe?.meta?.live ? "Live" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI */}
        <div style={{ marginTop: 14 }}>
          <SectionTitle> KPI kartalar </SectionTitle>

          <div style={{ marginTop: 10, ...gridKpiStyle }}>
            {loading ? (
              <>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </>
            ) : (
              <>
                <KpiCard
                  label="Savdo"
                  value={formatCompactUZS(kpi.sales)}
                  delta={kpi.salesDelta ?? 0}
                  onClick={() => openDrill("Savdo → /reports/sales", <div>...</div>)}
                />

                <KpiCard
                  label="Buyurtma"
                  value={uzNumber.format(kpi.orders ?? 0)}
                  delta={kpi.ordersDelta ?? 0}
                  onClick={() => openDrill("Buyurtma → /orders", <div>...</div>)}
                />

                <KpiCard
                  label="O‘rtacha чек"
                  value={formatCompactUZS(kpi.avgCheck)}
                  delta={kpi.avgCheckDelta ?? 0}
                  onClick={() => openDrill("O‘rtacha чек", <div>...</div>)}
                />

                <KpiCard
                  label="Foyda"
                  value={formatCompactUZS(kpi.profit)}
                  delta={kpi.profitDelta ?? 0}
                  hidden={!kpi.canSeeProfit}
                  onClick={() => openDrill("Foyda → /reports/pl", <div>...</div>)}
                />
              </>
            )}
          </div>
        </div>

        {/* CHARTS */}
        <div style={{ marginTop: 18 }}>
          <SectionTitle> Grafiklar </SectionTitle>

          <div style={{ marginTop: 10, ...grid2Style }}>
            <ChartCard
              title="Kunlik savdo (line)"
              loading={loading}
              onClick={() =>
                openDrill(
                  "Grafik drill-down",
                  <div>
                    Bu yerda tanlangan oraliqdagi buyurtmalar ro‘yxati chiqadi.
                    <div style={{ marginTop: 8, color: UI.muted }}>
                      Action: “vaqt oralig‘idagi buyurtmalar”
                    </div>
                  </div>
                )
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={safe?.charts?.salesDaily ?? []}>
                  <CartesianGrid stroke={UI.border} strokeDasharray="4 4" />
                  <XAxis dataKey="day" stroke={UI.muted} tick={{ fontSize: 12 }} />
                  <YAxis stroke={UI.muted} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${UI.border}`,
                      background: UI.surface,
                      color: UI.text,
                      fontSize: 13,
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke={UI.info} strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Buyurtmalar vaqti (bar)"
              loading={loading}
              onClick={() =>
                openDrill(
                  "Buyurtmalar drill-down",
                  <div>
                    Vaqt bo‘yicha buyurtmalar ro‘yxati.
                    <div style={{ marginTop: 8, color: UI.muted }}>
                      Action: “hour range → orders list”
                    </div>
                  </div>
                )
              }
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={safe?.charts?.ordersByHour ?? []}>
                  <CartesianGrid stroke={UI.border} strokeDasharray="4 4" />
                  <XAxis dataKey="hour" stroke={UI.muted} tick={{ fontSize: 12 }} />
                  <YAxis stroke={UI.muted} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: `1px solid ${UI.border}`,
                      background: UI.surface,
                      color: UI.text,
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="value" fill={UI.info} radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* LIVE STATUS */}
        <div style={{ marginTop: 18 }}>
          <SectionTitle> Jonli holat </SectionTitle>

          <div style={{ marginTop: 10, ...grid2Style }}>
            <Card style={{ padding: 16 }}>
              <SectionTitle
                right={
                  hasDelays ? (
                    <Button
                      variant="danger"
                      onClick={() =>
                        openDrill(
                          "⚠ Kechikkan buyurtmalar",
                          <div>
                            Action: /kitchen yoki /reports/kitchen-delays
                            <div style={{ marginTop: 8, color: UI.muted }}>
                              Hozir router yo‘q, shuning uchun modal.
                            </div>
                          </div>
                        )
                      }
                    >
                      Kechikkanlar
                    </Button>
                  ) : null
                }
              >
                Oshxona yuklamasi
              </SectionTitle>

              {loading ? (
                <>
                  <Skeleton mt={12} w="70%" />
                  <Skeleton mt={10} w="50%" />
                </>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13, lineHeight: "18px" }}>
                  <Row label="Tayyorlanmoqda" value={live?.kitchen?.preparing ?? 0} />
                  <div
                    onClick={
                      hasDelays
                        ? () => openDrill("Oshxona", <div>Kechikkan buyurtmalar tafsiloti.</div>)
                        : undefined
                    }
                    style={{
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: hasDelays ? `1px solid rgba(220,38,38,0.25)` : `1px solid transparent`,
                      background: hasDelays ? "rgba(220,38,38,0.08)" : "transparent",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      cursor: hasDelays ? "pointer" : "default",
                    }}
                  >
                    <span style={{ color: UI.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      Kechikkan
                    </span>
                    <span style={{ fontWeight: 800, color: hasDelays ? UI.danger : UI.text }}>
                      {live?.kitchen?.delayed ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            <Card style={{ padding: 16 }}>
              <SectionTitle>Kassadagi holat</SectionTitle>

              {loading ? (
                <>
                  <Skeleton mt={12} w="70%" />
                  <Skeleton mt={10} w="50%" />
                </>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10, fontSize: 13, lineHeight: "18px" }}>
                  <Row label="Ochiq buyurtma" value={live?.cashier?.openOrders ?? 0} />
                  <Row label="Bugungi tushum" value={formatCompactUZS(live?.cashier?.todayRevenue ?? 0)} />
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* TABLES */}
        <div style={{ marginTop: 18, ...grid2Style }}>
          <TableCard
            title="Top taomlar"
            loading={loading}
            rows={(safe?.topFoods ?? []).map((x) => ({
              left: x.name,
              right: `(${x.count})`,
            }))}
            onRowClick={(r) => openDrill("Top taom", <div>{r.left} tafsiloti</div>)}
          />

          <TableCard
            title="So‘nggi buyurtmalar"
            loading={loading}
            rows={(safe?.lastOrders ?? []).map((o) => ({
              left: `Stol ${o.table}`,
              right: `${uzCurrency.format(o.amount)} • ${o.status}`,
            }))}
            onRowClick={(r) => openDrill("Buyurtma", <div>{r.left} — {r.right}</div>)}
          />
        </div>

        <div style={{ marginTop: 18, color: UI.muted, fontSize: 12 }}>
          Auto-refresh: 15s • Filter o‘zgarsa skeleton + reload • Router ishlatilmagan (xatosiz)
        </div>
      </div>

      <Modal
        open={modal.open}
        title={modal.title}
        onClose={() => setModal({ open: false, title: "", content: null })}
      >
        {modal.content}
      </Modal>
    </div>
  );
}

/* =========================
   7) SMALL COMPONENTS
========================= */
function Select({ label, value, onChange, options }) {
  return (
    <div style={{ height: 40, display: "flex", alignItems: "center", gap: 8, padding: "0 10px", borderRadius: 12, border: `1px solid ${UI.border}`, background: UI.surface }}>
      <span style={{ fontSize: 13, color: UI.muted }}>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 34,
          border: "none",
          outline: "none",
          background: "transparent",
          color: UI.text,
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function KpiSkeleton() {
  return (
    <Card style={{ padding: 16 }}>
      <Skeleton h={14} w="60%" />
      <Skeleton h={28} w="70%" mt={10} r={10} />
      <Skeleton h={14} w="35%" mt={10} />
    </Card>
  );
}

function KpiCard({ label, value, delta, onClick, hidden }) {
  if (hidden) return null;

  const deltaColor = delta > 0 ? UI.positive : delta < 0 ? UI.warning : UI.muted;
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";

  return (
    <Card onClick={onClick} ariaLabel={`${label} tafsilot`} style={{ padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, lineHeight: "18px", fontWeight: 500, color: UI.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {label}
          </div>
          <div style={{ marginTop: 8, fontSize: 22, lineHeight: "30px", fontWeight: 700, color: UI.text }}>
            {value}
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 13, lineHeight: "18px", fontWeight: 700, color: deltaColor }}>
            {arrow} {Math.abs(delta)}%
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: UI.muted }}>View</div>
        </div>
      </div>
    </Card>
  );
}

function ChartCard({ title, loading, onClick, children }) {
  return (
    <Card onClick={onClick} ariaLabel={`${title} drill-down`} style={{ padding: 16 }}>
      <SectionTitle right={<div style={{ fontSize: 12, color: UI.muted }}>Bosib ko‘rish</div>}>
        {title}
      </SectionTitle>
      <div style={{ marginTop: 12, borderRadius: 12, border: `1px solid ${UI.border}`, background: UI.bg, padding: 12 }}>
        {loading ? <Skeleton h={220} /> : children}
      </div>
    </Card>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: UI.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <span style={{ fontWeight: 800, color: UI.text, flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function TableCard({ title, rows, loading, onRowClick }) {
  return (
    <Card style={{ padding: 16 }}>
      <SectionTitle>{title}</SectionTitle>

      <div style={{ marginTop: 12 }}>
        {loading ? (
          <>
            <Skeleton h={14} w="80%" />
            <Skeleton h={14} w="65%" mt={10} />
            <Skeleton h={14} w="70%" mt={10} />
          </>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {rows.map((r, idx) => (
              <div
                key={idx}
                onClick={() => onRowClick?.(r)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  paddingTop: 10,
                  borderTop: idx === 0 ? "none" : `1px solid ${UI.border}`,
                  cursor: onRowClick ? "pointer" : "default",
                  fontSize: 13,
                  lineHeight: "18px",
                }}
              >
                <span style={{ fontWeight: 700, color: UI.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.left}
                </span>
                <span style={{ color: UI.muted, flexShrink: 0, whiteSpace: "nowrap" }}>
                  {r.right}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
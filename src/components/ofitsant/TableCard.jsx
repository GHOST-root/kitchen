import React from "react";

function getCardStyle(status) {
  switch (status) {
    case "Bo‘sh": return { bg: "#ffffff", border: "#e2e8f0", text: "#10b981", icon: "🟢", shadow: "shadow-sm" }; 
    case "Band": return { bg: "#fff5f5", border: "#fecaca", text: "#ef4444", icon: "🔴", shadow: "shadow" }; 
    case "Tayyor": return { bg: "#fffbeb", border: "#fde68a", text: "#f59e0b", icon: "🟠", shadow: "shadow" }; 
    case "Hisob": return { bg: "#eff6ff", border: "#bfdbfe", text: "#3b82f6", icon: "🔵", shadow: "shadow" }; 
    default: return { bg: "#ffffff", border: "#e2e8f0", text: "#64748b", icon: "⚪", shadow: "shadow-sm" };
  }
}

export default function TableCard({ number, status, onClick }) {
  const { bg, border, text, icon, shadow } = getCardStyle(status);
  
  // 🔥 "Stol 1-Stol" bo'lib qolmasligi uchun aqlli formatlash:
  const numStr = String(number);
  const displayName = numStr.toLowerCase().includes("stol") ? numStr : `Stol ${numStr}`;

  return (
    <button
      type="button"
      className={`w-100 text-start ${shadow}`}
      style={{ 
        cursor: "pointer", 
        minHeight: 110,
        backgroundColor: bg, 
        border: `2px solid ${border}`,
        borderRadius: "16px",
        transition: "all 0.2s ease-in-out",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        outline: "none"
      }}
      onClick={onClick}
      // Hover effektlari (Mishka borganda sakraydi)
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div className="d-flex justify-content-between align-items-start w-100">
        {/* To'g'rilangan ism */}
        <div style={{ fontSize: "1.15rem", fontWeight: "800", color: "#1e293b", wordBreak: "break-word" }}>
          {displayName}
        </div>
        <div style={{ fontSize: "1rem" }} title={status}>{icon}</div>
      </div>
      
      <div className="mt-3 py-1 px-3 d-inline-block rounded-pill text-center" 
           style={{ backgroundColor: "#fff", border: `1px solid ${border}`, color: text, fontSize: "0.80rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {status}
      </div>
    </button>
  );
}
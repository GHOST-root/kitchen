import React from "react";

function chipClass(status){
  if (status === "Bo‘sh") return "chip chip-empty";
  if (status === "Band") return "chip chip-busy";
  if (status === "Tayyor") return "chip chip-ready";
  if (status === "Hisob") return "chip chip-bill";
  return "chip chip-empty";
}

export default function TableCard({ number, status, onClick }) {
  return (
    <button
      type="button"
      className="cardx p-3 w-100 text-start"
      style={{ cursor: "pointer", minHeight: 104 }}
      onClick={onClick}
    >
      <div className="h2x mb-2">Stol {number}</div>
      <div className={chipClass(status)}>{status}</div>
    </button>
  );
}
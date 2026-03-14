import React, { useContext } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Ofitsant from "./pages/ofitsant";
import Kassa from "./pages/Kassa";
import Oshxona from "./pages/Oshxona";
import PinAuth from "./pages/PinAuth"; 
import SetPin from "./pages/SetPin"; // 🔥 O'zingizdagi SetPin fayli chaqirildi

function App() {
  const { token, user, isUnlocked } = useContext(AuthContext);

  // 1-QADAM: TIZIMGA KIRMAGANLAR UCHUN (Token yo'q)
  if (!token) {
    return <Login />;
  }

  // 2-QADAM: TOKEN BOR, LEKIN PIN O'RNATILMAGAN
  if (user && user.pin_is_set === false) {
    return <SetPin />; // 🔥 Yangi PIN o'rnatish sahifasiga o'tadi
  }

  // 3-QADAM: TOKEN BOR, PIN HAM O'RNATILGAN, LEKIN KOD TERILMAGAN
  if (!isUnlocked) {
    return <PinAuth />; 
  }

  // 4-QADAM: HAMMASI JOYIDA (PIN TO'G'RI TERILGAN) - DASTUR ICHIGA KIRAMIZ
  return (
    <Routes>
      {/* 🔹 ADMIN */}
      {user?.role?.toLowerCase() === "admin" && (
        <>
          <Route path="/" element={<Dashboard />} />
          <Route path="/ofitsant" element={<Ofitsant />} />
          <Route path="/kassa" element={<Kassa />} />
          <Route path="/oshxona" element={<Oshxona />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      )}

      {/* 🔹 WAITER */}
      {user?.role?.toLowerCase() === "waiter" && (
        <>
          <Route path="/ofitsant" element={<Ofitsant />} />
          <Route path="*" element={<Navigate to="/ofitsant" replace />} />
        </>
      )}

      {/* 🔹 CASHIER */}
      {user?.role?.toLowerCase() === "cashier" && (
        <>
          <Route path="/kassa" element={<Kassa />} />
          <Route path="*" element={<Navigate to="/kassa" replace />} />
        </>
      )}

      {/* 🔹 KITCHEN */}
      {user?.role?.toLowerCase() === "kitchen" && (
        <>
          <Route path="/oshxona" element={<Oshxona />} />
          <Route path="*" element={<Navigate to="/oshxona" replace />} />
        </>
      )}
      
      {/* Agar xodimning roli noma'lum bo'lsa, xato bermasligi uchun */}
      <Route path="*" element={<div className="p-5 text-center">Noma'lum rol yoki sahifa topilmadi.</div>} />
    </Routes>
  );
}

export default App;
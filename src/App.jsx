import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Ofitsant from "./pages/ofitsant";
import Kassa from "./pages/Kassa";
import Oshxona from "./pages/Oshxona";
import PinAuth from "./pages/PinAuth";

function App() {
  const { user, isLocked } = useContext(AuthContext);

  return (
    <Routes>

      {/* 🔹 USER YO‘Q */}
      {!user && (
        <>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </>
      )}

      {/* 🔹 LOCKED */}
      {user && isLocked && (
        <>
          <Route path="*" element={<PinAuth />} />
        </>
      )}

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

    </Routes>
  );
}

export default App;
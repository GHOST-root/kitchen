import React, { useContext } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthContext } from "./context/AuthContext";

// Sahifalar
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import PinAuth from "./pages/PinAuth";
import Dashboard from "./pages/Dashboard";
import Kassa from "./pages/Kassa";
import Ofitsant from "./pages/ofitsant";
import Oshxona from "./pages/Oshxona";

function App() {
  const { user, isLocked } = useContext(AuthContext);

  // 1. Agar umuman login qilmagan bo'lsa
  if (!user) return <Login />;

  // 2. Agar login qilgan-u, lekin PIN oynasida bo'lsa (Bloklangan)
  if (isLocked) return <PinAuth username={user.username} />;

  return (
    <Router>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        
        {/* Faqat Adminlar hamma joyga o'ta olishi uchun Navbar */}
        {user.role === "admin" && <Navbar />}

        <main className="container-fluid py-4" style={{ flex: 1, background: "#f8fafc" }}>
          <Routes>
            
            {/* ---------------- ADMIN YO'LLARI ---------------- */}
            {user.role === "admin" && (
              <>
                <Route path="/" element={<Dashboard />} />
                <Route path="/oshxona" element={<Oshxona />} />
                <Route path="/ofitsant" element={<Ofitsant />} />
                <Route path="/kassa" element={<Kassa />} />
                {/* Admin noto'g'ri joyga kirsa, Dashboardga qaytadi */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}

            {/* ---------------- OFITSANT YO'LLARI ---------------- */}
            {user.role === "waiter" && (
              <>
                <Route path="/ofitsant" element={<Ofitsant />} />
                {/* Ofitsant qayerga kirmoqchi bo'lsa ham, faqat o'z sahifasiga qaytadi */}
                <Route path="*" element={<Navigate to="/ofitsant" replace />} />
              </>
            )}

            {/* ---------------- KASSA YO'LLARI ---------------- */}
            {user.role === "cashier" && (
              <>
                <Route path="/kassa" element={<Kassa />} />
                {/* Kassa qayerga kirmoqchi bo'lsa ham, faqat kassa sahifasiga qaytadi */}
                <Route path="*" element={<Navigate to="/kassa" replace />} />
              </>
            )}

          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
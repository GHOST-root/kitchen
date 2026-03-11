import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function Login() {
  const [phoneTail, setPhoneTail] = useState(""); // Faqat 9 ta raqam uchun
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (phoneTail.length !== 9) {
    alert("Telefon raqamini to'liq kiriting!");
    return;
  }

  setLoading(true);
  const fullPhone = "+998" + phoneTail;

  try {
    // ❌ fetch(...) ni olib tashlang
    // ✅ AuthContext'dagi fake loginni chaqiring
    await login(fullPhone, password); 
    
    // Muvaffaqiyatli bo'lsa, AuthContext o'zi sahifani almashtiradi
  } catch (error) {
    // Fake login'dan kelgan "Raqam yoki parol xato" xabarini ko'rsatadi
    alert(error.message); 
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="card p-4 shadow-sm" style={{ width: "380px", borderRadius: "20px" }}>
        <h3 className="text-center fw-bold mb-4">Tizimga kirish</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label small fw-bold">Telefon raqam</label>
            <div className="input-group">
              {/* O'zgarmas prefix qismi */}
              <span className="input-group-text bg-white border-end-0" style={{ borderRadius: "20px 0 0 20px" }}>
                +998
              </span>
  
              <input
                type="number"
                className="form-control numberinput border-start-0 no-spin" // Klass qo'shishingiz ham mumkin
                style={{ 
                    borderRadius: "0 20px 20px 0",
                    boxShadow: "none", // Fokus bo'lgandagi ko'k chiziqni yo'qotish uchun (ixtiyoriy)
                    outline: "none"
                }}
                placeholder="90 123 45 67"
                value={phoneTail}
                onInput={(e) => {
                    // Faqat 9 ta raqam kiritishni ta'minlash
                    if (e.target.value.length > 9) {
                    e.target.value = e.target.value.slice(0, 9);
                    }
                    setPhoneTail(e.target.value);
                }}
                required
                />

            </div>
          </div>

          <div className="mb-4">
            <label className="form-label small fw-bold">Parol</label>
            <input
              type="password"
              className="form-control rounded-pill"
              placeholder="••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 rounded-pill py-2 fw-bold"
            disabled={loading}
          >
            {loading ? "Kutilmoqda..." : "Tasdiqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}
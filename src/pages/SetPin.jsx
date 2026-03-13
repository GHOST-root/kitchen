import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";

export default function SetPin({ username }) {
  const { setupPin, logout } = useContext(AuthContext);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Klaviaturadan raqam bosilganda
  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      setPin((prev) => prev + num);
      setError("");
    }
  };

  // O'chirish tugmasi
  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  // PIN ni saqlash
  const handleSubmit = async () => {
    if (pin.length !== 4) {
      return setError("PIN kod 4 ta raqamdan iborat bo'lishi shart!");
    }
    
    setIsLoading(true);
    const success = await setupPin(pin);
    
    if (!success) {
      setError("PIN kod o'rnatishda xatolik yuz berdi.");
      setPin("");
    }
    setIsLoading(false);
  };

  return (
    <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-dark text-white">
      <div className="text-center mb-4">
        <h1 className="mb-2">⚙️</h1>
        <h3>Salom, {username || "Xodim"}!</h3>
        <p className="text-muted">Tizimga tezkor kirish uchun 4 xonali PIN kod o'rnating</p>
      </div>

      <div style={{ width: "100%", maxWidth: "320px" }} className="d-flex flex-column align-items-center">
        {error && <div className="alert alert-danger py-2 px-3 text-center small fw-bold w-100">{error}</div>}
        
        {/* PIN ko'rinadigan joy */}
        <div 
          className="form-control form-control-lg text-center fs-1 mb-4 bg-light text-dark"
          style={{ letterSpacing: "20px", borderRadius: "15px", height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {pin.padEnd(4, "•")}
        </div>

        {/* Ekrandagi Klaviatura (Numpad) */}
        <div className="d-flex justify-content-center flex-wrap" style={{ gap: "15px", maxWidth: "260px" }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              type="button" 
              className="btn btn-outline-light rounded-circle fw-bold" 
              style={{ width: "70px", height: "70px", fontSize: "28px" }} 
              onClick={() => handleKeyPress(num.toString())}
              disabled={isLoading}
            >
              {num}
            </button>
          ))}
          
          {/* O'chirish (Backspace) tugmasi */}
          <button 
            type="button" 
            className="btn btn-danger rounded-circle fw-bold" 
            style={{ width: "70px", height: "70px", fontSize: "24px" }} 
            onClick={handleDelete}
            disabled={isLoading || pin.length === 0}
          >
            ⌫
          </button>
          
          <button 
            type="button" 
            className="btn btn-outline-light rounded-circle fw-bold" 
            style={{ width: "70px", height: "70px", fontSize: "28px" }} 
            onClick={() => handleKeyPress("0")}
            disabled={isLoading}
          >
            0
          </button>
          
          {/* Tasdiqlash tugmasi */}
          <button 
            type="button" 
            className="btn btn-success rounded-circle fw-bold" 
            style={{ width: "70px", height: "70px", fontSize: "24px" }} 
            onClick={handleSubmit}
            disabled={isLoading || pin.length < 4}
          >
            ✓
          </button>
        </div>

        <button 
          className="btn btn-link text-muted mt-4 text-decoration-none"
          onClick={logout}
        >
          Tizimdan chiqish
        </button>
      </div>
    </div>
  );
}
import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // username o'rniga phone ishlatamiz
  const [phone, setPhone] = useState(""); 
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // login funksiyasiga phone ni beramiz
    const result = await login(phone, password);

    if (result.success) {
      switch (result.role) {
        case "cashier":
          navigate("/kassa");
          break;
        case "waiter":
          navigate("/ofitsant");
          break;
        case "kitchen":
          navigate("/oshxona");
          break;
        default:
          navigate("/"); 
      }
    } else {
      setError(result.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="vh-100 d-flex flex-column justify-content-center align-items-center bg-light">
      <div className="card border-0 shadow-lg p-4" style={{ width: "100%", maxWidth: "400px", borderRadius: "15px" }}>
        <div className="text-center mb-4">
          <div className="fs-1 mb-2">🍽️</div>
          <h3 className="fw-bold text-dark">BAXOR CAFE</h3>
          <div className="text-muted small">Tizimga kirish</div>
        </div>

        {error && <div className="alert alert-danger py-2 small fw-bold text-center">{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Telefon raqam inputi */}
          <div className="mb-3">
            <label className="form-label fw-bold text-secondary">Ism (Login)</label>
            <input
              type="text"
              className="form-control py-2 bg-light border-0"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+998901234567"
              required
            />
          </div>

          <div className="mb-4">
            <label className="form-label fw-bold text-secondary">Parol</label>
            <input
              type="password"
              className="form-control py-2 bg-light border-0"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-success w-100 py-2 fw-bold mb-3" 
            disabled={isLoading}
            style={{ borderRadius: "10px" }}
          >
            {isLoading ? "Tekshirilmoqda..." : "Kirish"}
          </button>

          <div className="text-center text-muted small">
            Hisobingiz yo'qmi?{" "}
            <span 
              className="text-success fw-bold" 
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate("/register")}
            >
              Ro'yxatdan o'ting
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
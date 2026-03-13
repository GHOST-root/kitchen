import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("waiter");
  const [password1, setPassword1] = useState("");
  const [password2, setPassword2] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const roles = [
    { key: "admin", label: "Admin" },
    { key: "cashier", label: "Kassir" },
    { key: "waiter", label: "Ofitsiant" },
    { key: "kitchen", label: "Oshpaz" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password1 !== password2) {
      return setError("Parollar bir-biriga mos kelmadi!");
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Faqat admin xodim qo‘sha oladi (login qiling)");
      }

      const response = await fetch("https://bilgex.pythonanywhere.com/employee/employees/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${token}`,
        },
        body: JSON.stringify({
          name: name,
          phone: phone,
          password: password1,
          role: role,
          is_active: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg =
          typeof data === "object"
            ? Object.values(data).flat().join(" ")
            : "Xatolik yuz berdi";
        throw new Error(msg);
      }

      setSuccess("Xodim muvaffaqiyatli qo‘shildi!");

      // tozalash
      setName("");
      setPhone("");
      setPassword1("");
      setPassword2("");

      setTimeout(() => navigate("/"), 1500);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vh-100 d-flex justify-content-center align-items-center bg-light">
      <div className="card border-0 shadow-lg p-4" style={{ width: "100%", maxWidth: "450px", borderRadius: "15px" }}>
        <h3 className="fw-bold text-center mb-4 text-dark">Xodim qo'shish</h3>

        {error && <div className="alert alert-danger py-2 small fw-bold">{error}</div>}
        {success && <div className="alert alert-success py-2 small fw-bold">{success}</div>}

        <form onSubmit={handleSubmit}>
          {/* NAME */}
          <div className="mb-3">
            <label className="form-label fw-bold text-secondary">To‘liq ism</label>
            <input
              type="text"
              className="form-control bg-light border-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* PHONE */}
          <div className="mb-3">
            <label className="form-label fw-bold text-secondary">Telefon</label>
            <input
              type="text"
              className="form-control bg-light border-0"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* ROLE */}
          <div className="mb-3">
            <label className="form-label fw-bold text-secondary">Lavozimi</label>
            <select
              className="form-select bg-light border-0"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>

          {/* PASSWORD */}
          <div className="row g-2 mb-3">
            <div className="col-6">
              <label className="form-label fw-bold text-secondary">Parol</label>
              <input
                type="password"
                className="form-control bg-light border-0"
                value={password1}
                onChange={(e) => setPassword1(e.target.value)}
                required
              />
            </div>
            <div className="col-6">
              <label className="form-label fw-bold text-secondary">Tasdiqlash</label>
              <input
                type="password"
                className="form-control bg-light border-0"
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-bold"
            disabled={isLoading}
            style={{ borderRadius: "10px" }}
          >
            {isLoading ? "Saqlanmoqda..." : "Qo‘shish"}
          </button>

          <div className="text-center text-muted small mt-3">
            Allaqachon hisobingiz bormi?{" "}
            <span
              className="text-primary fw-bold"
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate("/login")}
            >
              Tizimga kiring
            </span>
          </div>

        </form>
      </div>
    </div>
  );
}
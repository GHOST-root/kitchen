import React, { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";

export default function PinAuth({ username }) {
  const [pin, setPin] = useState("");
  const [isSetupMode, setIsSetupMode] = useState(false);
  const { setIsLocked } = useContext(AuthContext);

  useEffect(() => {
    // 1. Tizimda oldin PIN saqlanganmi yoki yo'qmi tekshiramiz
    const savedPin = localStorage.getItem("user_pin");
    if (!savedPin) {
      setIsSetupMode(true); // PIN yo'q bo'lsa, o'rnatish rejimiga o'tadi
    }
  }, []);

  const handleKeyClick = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // 4 ta raqam terilganda darhol tekshirishga yuboramiz
      if (newPin.length === 4) {
        setTimeout(() => processPin(newPin), 150); // UI chizilib ulgurishi uchun kichik kechikish
      }
    }
  };

  const processPin = (finalPin) => {
    if (isSetupMode) {
      // Yangi PIN o'rnatish mantiqi
      localStorage.setItem("user_pin", finalPin);
      setIsSetupMode(false);
      setIsLocked(false); // Blokdan chiqarish
    } else {
      // Mavjud PIN ni tekshirish mantiqi
      const savedPin = localStorage.getItem("user_pin");
      if (finalPin === savedPin) {
        setIsLocked(false); // PIN to'g'ri bo'lsa, o'z sahifasiga kiradi
      } else {
        alert("PIN kod noto'g'ri! Iltimos, qayta urinib ko'ring.");
        setPin(""); // Xato bo'lsa tozalab tashlaymiz
      }
    }
  };

  return (
    <div className="vh-100 d-flex flex-column align-items-center justify-content-center bg-dark text-white">
      <div className="mb-4 text-center">
        <div className="rounded-circle bg-primary mb-3 mx-auto d-flex align-items-center justify-content-center" style={{ width: "70px", height: "70px" }}>
          <span className="fs-1">👤</span>
        </div>
        <h4>Salom, {username}!</h4>
        <p className="text-warning fw-bold">
          {isSetupMode ? "Yangi 4 talik PIN kod o'rnating" : "4 talik PIN kodni kiriting"}
        </p>
      </div>

      {/* PIN nuqtalari (kiritilgan raqamlar soniga qarab oq rangga kiradi) */}
      <div className="d-flex gap-3 mb-5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`rounded-circle border border-secondary ${pin.length >= i ? "bg-white" : ""}`}
            style={{ width: "20px", height: "20px", transition: "0.2s" }}
          ></div>
        ))}
      </div>

      

      {/* Raqamli klaviatura */}
      <div className="container" style={{ maxWidth: "300px" }}>
        <div className="row g-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "⌫"].map((btn) => (
            <div className="col-4 text-center" key={btn}>
              <button
                className="btn btn-outline-light rounded-circle fw-bold fs-4 d-flex align-items-center justify-content-center mx-auto"
                style={{ width: "70px", height: "70px" }}
                onClick={() => {
                  if (btn === "C") setPin("");
                  else if (btn === "⌫") setPin(pin.slice(0, -1));
                  else handleKeyClick(btn);
                }}
              >
                {btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
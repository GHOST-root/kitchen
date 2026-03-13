import React, { createContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Dastlabki qiymat false, lekin sahifa yangilanganda true bo'ladi
  const [isLocked, setIsLocked] = useState(false); 

  const navigate = useNavigate();
  const BASE_URL = "https://bilgex.pythonanywhere.com";

  // 1. SAHIFA YANGILANGANDA (Tokenni o'qish va PIN so'rash)
  useEffect(() => {
  const savedToken = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (savedToken && savedUser && savedUser !== "undefined") {
    try {
      setUser(JSON.parse(savedUser));
      setIsLocked(true);
    } catch (err) {
      console.error("USER PARSE ERROR:", err);
      localStorage.removeItem("user");
    }
  }

  setLoading(false);
}, []);

  // 2. ASOSIY LOGIN
  const login = async (phone, password) => {
  try {
    console.log("LOGIN DATA:", { phone, password });

    const res = await fetch(`${BASE_URL}/employee/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone,
        password: password,
      }),
    });

    console.log("STATUS:", res.status);

    const text = await res.text(); // 🔴 avval text olamiz
    console.log("RAW RESPONSE:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (!res.ok) {
      return {
        success: false,
        message: typeof data === "object"
          ? Object.values(data).flat().join(" ")
          : data,
      };
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.employee));
    setUser(data.employee);

    return { success: true, role: data.employee.role.toLowerCase() };

  } catch (err) {
    console.error("LOGIN ERROR:", err); // 🔴 MUHIM
    return { success: false, message: "Server bilan ulanishda xato" };
  }
};

  // 3. TIZIMDAN CHIQISH
  const logout = () => {
    setUser(null);
    setIsLocked(false);
    localStorage.clear();
    navigate("/login");
  };

  // 4. EKRANNI QULFLASH TUGMASI UCHUN
  const lockScreen = () => {
    setIsLocked(true);
  };

  // 5. PIN KOD BILAN OCHISH (To'g'rilangan)
  const unlockScreen = async (pin) => {
    try {
      // LocalStorage'dan xodimning telefon raqamini olamiz
      const storedUser = JSON.parse(localStorage.getItem("user"));
      if (!storedUser || !storedUser.phone) return false;

      const response = await fetch(`${BASE_URL}/employee/auth/pin-login/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json"
          // Odatda login qilishda token so'ralmaydi, shuning uchun olib tashladik.
          // Agar xato bersa yana qo'shib ko'rasiz: "Authorization": `Token ${localStorage.getItem("token")}`
        },
        // API so'ragan maydonlarni jo'natamiz (phone va quick_pin)
        body: JSON.stringify({ 
          phone: storedUser.phone, 
          quick_pin: pin 
        }),
      });

      if (!response.ok) {
        return false; // PIN xato bo'lsa yoki topilmasa
      }

      // PIN to'g'ri kelsa ekranni ochamiz
      setIsLocked(false);
      return true;

    } catch (error) {
      console.error("PIN tekshirishda xatolik:", error);
      return false;
    }
  };

// ... oldingi kodlar (login, logout)

  // PIN O'RNATISH (Birinchi marta kirganda)
  const setupPin = async (newPin) => {
    try {
      const token = localStorage.getItem("token");
      
      const response = await fetch(`${BASE_URL}/employee/auth/set-pin/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Token ${token}` 
        },
        // MANA SHU YER O'ZGARDI:
        body: JSON.stringify({ 
          quick_pin: newPin, 
          confirm_pin: newPin 
        }), 
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API QAYTARGAN XATO:", errorData);
        // Agar xato bo'lsa ekranga chiqarish (ixtiyoriy)
        return false;
      }

      // Hammasi joyida bo'lsa, foydalanuvchini yangilaymiz
      const updatedUser = { ...user, pin_is_set: true };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      return true;

    } catch (error) {
      console.error("PIN o'rnatishda xato:", error);
      return false;
    }
  };

  return (
    // E'tibor bering, loading dan oldin setupPin ni qo'shib qo'ydik:
    <AuthContext.Provider value={{ user, isLocked, login, logout, lockScreen, unlockScreen, setupPin, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
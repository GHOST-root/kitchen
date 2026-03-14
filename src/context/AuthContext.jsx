import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null); // 🔥 MUHIM: Token state qo'shildi
  const [loading, setLoading] = useState(true);
  
  // 🔥 MUHIM: Boshlang'ich holat doim false. Sahifa yangilanganda ham false bo'ladi, shunda PIN so'raydi!
  const [isUnlocked, setIsUnlocked] = useState(false); 
  
  const unlockApp = () => setIsUnlocked(true);
  const BASE_URL = "https://bilgex.pythonanywhere.com";

  // 1. SAHIFA YANGILANGANDA (LocalStorage'dan o'qish)
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");

    if (savedToken && savedUser && savedUser !== "undefined") {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // isUnlocked FALSE bo'lib qolaveradi, shuning uchun avtomat PIN so'raydi
      } catch (err) {
        console.error("USER PARSE ERROR:", err);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
      }
    }
    setLoading(false);
  }, []);

  // 2. ASOSIY LOGIN
  const login = async (phone, password) => {
    try {
      const res = await fetch(`${BASE_URL}/employee/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }

      if (!res.ok) {
        return {
          success: false,
          message: typeof data === "object" ? Object.values(data).flat().join(" ") : data,
        };
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.employee));
      
      setToken(data.token);
      setUser(data.employee);
      
      return { success: true, role: data.employee.role.toLowerCase() };

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      return { success: false, message: "Server bilan ulanishda xato" };
    }
  };

  // 3. TIZIMDAN CHIQISH (LOGOUT)
  const logout = () => {
    setToken(null);
    setUser(null);
    setIsUnlocked(false); // Bloklaymiz
    localStorage.clear();
  };

  // 4. EKRANNI QULFLASH TUGMASI UCHUN
  const lockScreen = () => {
    setIsUnlocked(false);
  };

  // 5. PIN KOD BILAN OCHISH
  const unlockScreen = async (pin) => {
    try {
      if (!user || !user.phone) return false;

      const response = await fetch(`${BASE_URL}/employee/auth/pin-login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: user.phone, quick_pin: pin }),
      });

      if (!response.ok) return false; 

      // PIN to'g'ri kelsa ekranni ochamiz
      setIsUnlocked(true);
      return true;

    } catch (error) {
      console.error("PIN tekshirishda xatolik:", error);
      return false;
    }
  };

  // 6. PIN O'RNATISH (Birinchi marta kirganda)
  const setupPin = async (newPin) => {
    try {
      const response = await fetch(`${BASE_URL}/employee/auth/set-pin/`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Token ${token}` 
        },
        body: JSON.stringify({ quick_pin: newPin, confirm_pin: newPin }), 
      });

      if (!response.ok) return false;

      // Foydalanuvchi ma'lumotlarini yangilaymiz (pin_is_set = true)
      const updatedUser = { ...user, pin_is_set: true };
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      
      // O'rnatgandan so'ng darhol tizimga kiritvoramiz
      setIsUnlocked(true); 
      return true;

    } catch (error) {
      console.error("PIN o'rnatishda xato:", error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      isUnlocked, 
      loading, 
      login, 
      logout, 
      lockScreen, 
      unlockScreen, 
      unlockApp, 
      setupPin 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
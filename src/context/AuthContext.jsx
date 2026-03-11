import React, { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

// 🛑 TEST UCHUN BAZA (API tayyor bo'lguncha)
const FAKE_USERS = [
  { phone: "+998901234567", password: "111", role: "waiter", first_name: "Aziz" },
  { phone: "+998919998877", password: "222", role: "admin", first_name: "Adminbek" },
  { phone: "+998935554433", password: "333", role: "cashier", first_name: "Malika" }
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLocked, setIsLocked] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("user_data");
    const username = localStorage.getItem("username");
    if (savedUser) {
      setUser({ ...JSON.parse(savedUser), username });
    }
  }, []);

  // Fake Login funksiyasi
  // AuthContext.jsx ichidagi login funksiyasi:
  const login = async (phone, password) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const foundUser = FAKE_USERS.find(u => u.phone === phone && u.password === password);

        if (foundUser) {
          const userData = { token: "fake-jwt-token", role: foundUser.role, first_name: foundUser.first_name };
          localStorage.setItem("user_data", JSON.stringify(userData));
          localStorage.setItem("username", foundUser.first_name);
          
          setUser({ ...userData, username: foundUser.first_name });
          
          // 🛑 O'ZGARISH: Bu yerni o'chirib tashlaymiz yoki true qilamiz, 
          // shunda PIN oynasi ochilishi majburiy bo'ladi:
          setIsLocked(true); 
          
          resolve(userData);
        } else {
          reject(new Error("Telefon raqam yoki parol xato!"));
        }
      }, 800);
    });
  };

  const logout = () => {
    // 1. LocalStorage'dagi barcha shaxsiy ma'lumotlarni tozalaymiz
    localStorage.removeItem("user_data");
    localStorage.removeItem("username");
    localStorage.removeItem("user_pin");
    
    // 2. State'larni asl holiga qaytaramiz
    setUser(null);
    setIsLocked(true);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLocked, setIsLocked }}>
      {children}
    </AuthContext.Provider>
  );
};
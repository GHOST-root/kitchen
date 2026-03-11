/**
 * Markazlashtirilgan xato boshqaruvi
 */

// Xato turlarini aniqlash va inson tili xabarlari
export const getErrorMessage = (error) => {
  if (!error) return "Noma'lum xato";

  // Network xatosi
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return "Internet ulanishi mavjud emas yoki server yuklanmaydi";
  }

  // HTTP xatosi
  if (error.message.includes("HTTP")) {
    const status = error.message.match(/HTTP (\d+)/)?.[1];
    switch (status) {
      case "400":
        return "Noto'g'ri so'rov. Iltimos ma'lumotlarni tekshiring";
      case "401":
        return "Avtentifikatsiya xatosi. Qayta login qiling";
      case "403":
        return "Ruxsat yo'q. Ushbu amalni bajarishga ruxsatingiz yo'q";
      case "404":
        return "Topilmadi. Bosh ma'lumot mavjud emas";
      case "500":
        return "Server xatosi. Iloji boricha keyinroq harakat qiling";
      case "502":
      case "503":
        return "Server vaqti bo'yicha ishlamaydi. Iloji boricha keyinroq harakat qiling";
      default:
        return `Server xatosi: ${status}`;
    }
  }

  // Printer xatosi
  if (error.code === "PRINTER_NOT_CONNECTED") {
    return "Printer ulanmagan. Printer plugini tekshiring";
  }
  if (error.code === "PRINTER_ERROR") {
    return "Printer xatosi. Uni qayta boshlang yoki tug'rashi uchun yordam oling";
  }

  // Ushbu xato xabari
  if (error.message) {
    return error.message;
  }

  return "Noma'lum xato yuz berdi";
};

// Xato logga yozish
export const logError = (operation, error) => {
  console.error(`❌ ${operation}:`, {
    message: error?.message || error,
    code: error?.code,
    name: error?.name,
    timestamp: new Date().toISOString(),
  });
};

// Xato klassifikatsiyasi
export const getErrorType = (error) => {
  if (error.code === "PRINTER_NOT_CONNECTED" || error.code === "PRINTER_ERROR") {
    return "PRINTER_ERROR";
  }
  if (error.message && error.message.includes("HTTP")) {
    return "API_ERROR";
  }
  if (error.name === "TypeError") {
    return "NETWORK_ERROR";
  }
  return "UNKNOWN_ERROR";
};

// Qayta urinishga layoqli xato
export const isRetryable = (error) => {
  if (!error) return false;
  const type = getErrorType(error);
  // Network xatolari, server xatolari va printer xatolari qayta urinishga layoqli
  return ["NETWORK_ERROR", "PRINTER_ERROR"].includes(type) ||
    (type === "API_ERROR" && (error.message.includes("502") || error.message.includes("503")));
};

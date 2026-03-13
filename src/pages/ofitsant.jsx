import React, { useMemo, useState } from "react";
import WaiterHome from "../components/ofitsant/WaiterHome.jsx";
import OrderScreen from "../components/ofitsant/OrderScreen.jsx";
import "../styles/ofitsantStyles.css"

export default function Ofitsant() {
  // ofitsant.jsx ichida:
  const [activeTableData, setActiveTableData] = useState(null);

  return (
    <div className="ofitsant-page-wrapper">
      {!activeTableData ? (
        // Endi n emas, obyekt keladi
        <WaiterHome onOpenTable={(data) => setActiveTableData(data)} /> 
      ) : (
        <OrderScreen
          tableData={activeTableData} // Butun ma'lumotni berib yuboramiz
          onBack={() => setActiveTableData(null)}
        />
      )}
    </div>
  );
}
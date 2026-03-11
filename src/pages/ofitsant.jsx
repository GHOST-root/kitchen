import React, { useMemo, useState } from "react";
import WaiterHome from "../components/ofitsant/WaiterHome.jsx";
import OrderScreen from "../components/ofitsant/OrderScreen.jsx";
import { mockMenu } from "../components/ofitsant/mockData.jsx";
import "../styles/ofitsantStyles.css"

export default function Ofitsant() {
  const [activeTableNumber, setActiveTableNumber] = useState(null);
  const menu = useMemo(() => mockMenu(), []);

  return (
    <div className="ofitsant-page-wrapper"> {/* Maxsus o'rovchi klass */}
      {activeTableNumber == null ? (
        <WaiterHome onOpenTable={(n) => setActiveTableNumber(n)} />
      ) : (
        <OrderScreen
          tableId={activeTableNumber}
          menu={menu}
          onBack={() => setActiveTableNumber(null)}
        />
      )}
    </div>
  );
}
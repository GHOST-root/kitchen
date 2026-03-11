export function mockTables(){
  return [
    { id: 1, number: 1, status: "Bo‘sh" },
    { id: 2, number: 2, status: "Band" },
    { id: 3, number: 3, status: "Tayyor" },
    { id: 4, number: 4, status: "Hisob" },
    { id: 12, number: 12, status: "Band" },
  ];
}

export function mockMenu(){
  return {
    categories: [
      { id: "pizza", name: "Pitsa" },
      { id: "burger", name: "Burger" },
      { id: "drink", name: "Ichimlik" },
      { id: "dessert", name: "Desert" },
    ],
    products: [
      { id: 1, categoryId: "pizza", name: "Margherita", desc: "Klassik", price: 45000 },
      { id: 2, categoryId: "pizza", name: "Pepperoni", desc: "Achchiq", price: 55000 },
      { id: 3, categoryId: "drink", name: "Cola", desc: "0.5L", price: 10000 },
      { id: 4, categoryId: "burger", name: "Cheeseburger", desc: "Sigir go‘shti", price: 38000 },
    ],
  };
}
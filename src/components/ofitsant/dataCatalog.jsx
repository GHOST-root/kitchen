// src/dataCatalog.jsx
export const CATEGORIES = [
  { id: "pizza", name: "Pitsa" },
  { id: "burger", name: "Burger" },
  { id: "drink", name: "Ichimlik" },
  { id: "dessert", name: "Desert" },
];

export const PRODUCTS = [
  { id: "marg", categoryId: "pizza", name: "Margherita", price: 45000 },
  { id: "pep", categoryId: "pizza", name: "Pepperoni", price: 55000 },
  { id: "cola", categoryId: "drink", name: "Cola", price: 10000 },
  { id: "cheese", categoryId: "burger", name: "Cheese Burger", price: 38000 },
  { id: "choco", categoryId: "dessert", name: "Choco Cake", price: 28000 },
];

export function formatSum(n){
  return new Intl.NumberFormat("uz-UZ").format(Number(n || 0));
}

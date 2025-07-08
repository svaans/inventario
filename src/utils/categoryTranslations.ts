export const CATEGORY_TRANSLATIONS: Record<string, string> = {
  Drinks: "Bebidas",
  Beverages: "Bebidas",
  Ingredients: "Ingredientes",
  Ingredient: "Ingredientes",
  "Other prepared foods": "Otros alimentos preparados",
  "Other foods": "Otros alimentos preparados",
};

export function translateCategory(name: string): string {
  return CATEGORY_TRANSLATIONS[name] || name;
}
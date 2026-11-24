export type ShopProductSummary = {
  id: number;
};

export function resolveShopProduct<T extends ShopProductSummary>(products: T[], selectedId: number | null): T | null {
  if (products.length === 0) return null;
  return products.find(product => product.id === selectedId) ?? products[0];
}

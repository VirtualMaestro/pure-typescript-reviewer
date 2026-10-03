const stock = new Map<string, number>();

async function readStock(sku: string): Promise<number> {
  await new Promise((resolve) => setImmediate(resolve));
  return stock.get(sku) ?? 0;
}

export function restock(sku: string, quantity: number): void {
  stock.set(sku, (stock.get(sku) ?? 0) + quantity);
}

export async function reserve(sku: string, quantity: number): Promise<void> {
  const current = await readStock(sku);
  stock.set(sku, current - quantity);
}

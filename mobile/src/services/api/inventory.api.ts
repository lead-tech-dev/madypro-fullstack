import { apiFetch } from './client';

export type InventoryItem = {
  id: string;
  siteId: string;
  name: string;
  barcode?: string | null;
  unit: string;
  quantity: number;
  minThreshold: number;
};

export async function findInventoryItemByBarcode(token: string, barcode: string) {
  return apiFetch<InventoryItem>({ path: `/inventory/barcode/${encodeURIComponent(barcode)}`, token });
}

export async function adjustInventoryQuantity(token: string, id: string, delta: number) {
  return apiFetch<InventoryItem>({
    path: `/inventory/${id}/adjust`,
    token,
    options: { method: 'PATCH', body: JSON.stringify({ delta }) },
  });
}

export async function listInventoryForSite(token: string, siteId: string) {
  const response = await apiFetch<InventoryItem[] | null>({ path: `/inventory?siteId=${siteId}`, token });
  return Array.isArray(response) ? response : [];
}

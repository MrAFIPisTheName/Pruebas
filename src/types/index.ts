export type Warehouse = "SAN" | "SCN" | "LIB" | "BLDSRV";

/**
 * Estructura única para los 4 depósitos: todos los catálogos reales (Kitchen
 * → SAN/"Supply depot FOOD", Mantenimiento → SCN, Librería → LIB, BLDSRV)
 * traen únicamente código, nombre y "MAX quantity". El mínimo se calcula a
 * partir del máximo (ver src/utils/order.ts). Ningún depósito trae hoy datos
 * adicionales tipo categoría o stock actual.
 */
export interface InventoryItem {
  codigo: string;
  nombre: string;
  minimo: number;
  maximo: number;
  /** Ubicación física (bin) del ítem en el depósito. No todos los depósitos lo traen (ej. Librería). */
  bin?: string;
}

export interface OrderLine {
  codigo: string;
  nombre: string;
  cantidad: number;
}

export interface SavedSession {
  warehouse: Warehouse;
  /** Cantidades contadas físicamente, por código de ítem. */
  counts: Record<string, number>;
  index: number;
  updatedAt: string;
}

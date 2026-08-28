import type { InventoryItem, OrderLine } from "../types";

/**
 * Reglas de negocio confirmadas con el usuario:
 * - Corresponde pedir un ítem cuando la cantidad contada es menor al mínimo.
 * - La cantidad a pedir es (máximo - contada).
 * Ítems sin conteo registrado (no aparecen en `counts`) se excluyen del pedido.
 */
export function computeOrderLines(catalog: InventoryItem[], counts: Record<string, number>): OrderLine[] {
  const lines: OrderLine[] = [];
  for (const item of catalog) {
    const counted = counts[item.codigo];
    if (counted === undefined || !Number.isFinite(counted)) continue;
    if (counted >= item.minimo) continue;
    const cantidad = item.maximo - counted;
    if (cantidad > 0) {
      lines.push({ codigo: item.codigo, nombre: item.nombre, cantidad });
    }
  }
  return lines;
}

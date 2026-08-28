import type { Warehouse } from "../types";

/**
 * Nombres visibles para el usuario. Los identificadores internos ("SAN"/"SCN"/
 * "LIB"/"BLDSRV") se mantienen estables porque son la clave de los catálogos
 * (src/data/*.json) y quedan persistidos en localStorage de sesiones ya
 * guardadas — cambiarlos rompería pedidos en curso de usuarios que ya tengan
 * la app abierta.
 */
export const WAREHOUSE_LABELS: Record<Warehouse, string> = {
  SAN: "Supply depot FOOD",
  SCN: "Supply depot MNT",
  LIB: "Librería",
  BLDSRV: "BLDSRV"
};

/** Sufijo corto y apto para nombres de archivo, usado en la exportación a Excel. */
export const WAREHOUSE_FILE_SLUGS: Record<Warehouse, string> = {
  SAN: "FOOD",
  SCN: "MNT",
  LIB: "LIB",
  BLDSRV: "BLDSRV"
};

export function warehouseLabel(warehouse: Warehouse | null | undefined): string {
  if (!warehouse) return "";
  return WAREHOUSE_LABELS[warehouse];
}

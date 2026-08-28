import { useEffect, useState } from "react";
import san from "../data/san.json";
import scn from "../data/scn.json";
import lib from "../data/lib.json";
import bldsrv from "../data/bldsrv.json";
import { fetchCatalogOverride } from "../services/firebase";
import type { InventoryItem, Warehouse } from "../types";

/** Datos incluidos en el build — funcionan al instante y offline. */
export const BUNDLED_CATALOGS: Record<Warehouse, InventoryItem[]> = {
  SAN: san as InventoryItem[],
  SCN: scn as InventoryItem[],
  LIB: lib as InventoryItem[],
  BLDSRV: bldsrv as InventoryItem[]
};

/**
 * Devuelve siempre primero los datos del build (instantáneo, funciona sin
 * conexión) y, si un administrador reemplazó la lista de este depósito en
 * algún momento, la actualiza apenas llega la respuesta de Firestore. Si no
 * hay conexión o Firestore no está configurado, se queda con los datos del
 * build sin romper nada — es el mismo criterio de "nunca romper la app" que
 * ya usamos con Google Sheets.
 */
export function useCatalog(warehouse: Warehouse | null): InventoryItem[] {
  const [items, setItems] = useState<InventoryItem[]>(() => (warehouse ? BUNDLED_CATALOGS[warehouse] : []));

  useEffect(() => {
    if (!warehouse) {
      setItems([]);
      return;
    }
    setItems(BUNDLED_CATALOGS[warehouse]);
    let cancelled = false;
    fetchCatalogOverride(warehouse).then((override) => {
      if (!cancelled && override && override.length > 0) {
        setItems(override);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [warehouse]);

  return items;
}

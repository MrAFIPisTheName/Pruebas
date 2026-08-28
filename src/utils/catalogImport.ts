import * as XLSX from "xlsx";
import type { InventoryItem, Warehouse } from "../types";

export interface CatalogParseResult {
  items: InventoryItem[];
  detectedWarehouse: Warehouse | null;
  skippedRows: number;
}

export class CatalogParseError extends Error {}

function computeMinimo(maximo: number): number {
  const raw = maximo * 0.25;
  const entero = Math.floor(raw + 0.5); // redondeo estándar (0,5 hacia arriba), no "banker's rounding"
  return Math.round(entero / 5) * 5; // al múltiplo de 5 más cercano
}

function cleanNombre(codigo: string, desc: string): string {
  const re = new RegExp(`^\\(0*${codigo}\\)\\s*`);
  return desc.replace(re, "").trim();
}

function detectWarehouse(depotText: string | null): Warehouse | null {
  if (!depotText) return null;
  const t = depotText.toLowerCase();
  if (t.includes("kitchen")) return "SAN";
  if (t.includes("mantenimiento")) return "SCN";
  if (t.includes("librer") || t.includes("library")) return "LIB";
  if (t.includes("building service") || t.includes("bldsrv")) return "BLDSRV";
  return null;
}

/**
 * Parsea un Excel de "Depot Checklist" con el mismo criterio usado para los
 * catálogos originales: código y nombre desde "Item code"/"Item description"
 * (se limpia el prefijo "(código)" del nombre), mínimo calculado desde
 * "MAX quantity" (25% → redondeo estándar → múltiplo de 5 más cercano), y
 * bin tomado tal cual de "Bin location", sin ninguna transformación. El
 * orden de las filas se preserva (respeta el orden de bin del Excel).
 */
export async function parseCatalogFile(file: File): Promise<CatalogParseResult> {
  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    throw new CatalogParseError("No se pudo leer el archivo.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new CatalogParseError("El archivo no parece ser un Excel válido.");
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new CatalogParseError("El Excel no tiene ninguna hoja.");
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  if (rows.length === 0) throw new CatalogParseError("El Excel no tiene filas de datos.");

  const items: InventoryItem[] = [];
  let detectedWarehouse: Warehouse | null = null;
  let skippedRows = 0;

  for (const row of rows) {
    const codigoRaw = row["Item code"];
    const descRaw = row["Item description"];
    const maxRaw = row["MAX quantity"];
    if (codigoRaw == null || descRaw == null || maxRaw == null) {
      skippedRows++;
      continue;
    }
    const codigoNum = Number(codigoRaw);
    const maximoNum = Number(maxRaw);
    if (!Number.isFinite(codigoNum) || !Number.isFinite(maximoNum)) {
      skippedRows++;
      continue;
    }

    const codigo = String(Math.trunc(codigoNum));
    const maximo = Math.trunc(maximoNum);
    const nombre = cleanNombre(codigo, String(descRaw));
    const minimo = computeMinimo(maximo);
    const item: InventoryItem = { codigo, nombre, minimo, maximo };

    const binRaw = row["Bin location"];
    if (binRaw != null && String(binRaw).trim() !== "") {
      item.bin = String(binRaw);
    }
    items.push(item);

    if (detectedWarehouse === null && row["Depot"] != null) {
      detectedWarehouse = detectWarehouse(String(row["Depot"]));
    }
  }

  if (items.length === 0) {
    throw new CatalogParseError(
      'No se encontró ninguna fila válida. El Excel necesita las columnas ' +
      '"Item code", "Item description" y "MAX quantity".'
    );
  }

  return { items, detectedWarehouse, skippedRows };
}

/** Compara ítem por ítem (incluido el orden) para detectar si es exactamente la misma lista. */
export function catalogsAreIdentical(a: InventoryItem[], b: InventoryItem[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.codigo !== y.codigo ||
      x.nombre !== y.nombre ||
      x.minimo !== y.minimo ||
      x.maximo !== y.maximo ||
      (x.bin ?? "") !== (y.bin ?? "")
    ) {
      return false;
    }
  }
  return true;
}

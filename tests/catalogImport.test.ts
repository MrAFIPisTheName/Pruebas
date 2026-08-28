import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { catalogsAreIdentical, CatalogParseError, parseCatalogFile } from "../src/utils/catalogImport";
import type { InventoryItem } from "../src/types";

function buildXlsxFile(rows: Record<string, unknown>[], filename = "test.xlsx"): File {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Sheet1");
  const buffer = XLSX.write(book, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buffer], filename, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

const VALID_ROWS = [
  { Depot: "Kitchen Supplies Depot", "Item code": 1020291, "Item description": "(01020291) CAFÉ; tostado en grano", "MAX quantity": 300, "Bin location": "CA A01 A01" },
  { Depot: "Kitchen Supplies Depot", "Item code": 1011775, "Item description": "(1011775) ESENCIA; de vainilla", "MAX quantity": 6, "Bin location": null }
];

describe("parseCatalogFile", () => {
  it("parsea código, nombre limpio, mínimo calculado y bin", async () => {
    const file = buildXlsxFile(VALID_ROWS);
    const result = await parseCatalogFile(file);
    expect(result.items).toEqual<InventoryItem[]>([
      { codigo: "1020291", nombre: "CAFÉ; tostado en grano", minimo: 75, maximo: 300, bin: "CA A01 A01" },
      { codigo: "1011775", nombre: "ESENCIA; de vainilla", minimo: 0, maximo: 6 }
    ]);
    expect(result.detectedWarehouse).toBe("SAN");
    expect(result.skippedRows).toBe(0);
  });

  it("salta filas incompletas sin tirar la carga entera", async () => {
    const rows = [...VALID_ROWS, { Depot: "Kitchen Supplies Depot", "Item code": null, "Item description": "sin código", "MAX quantity": 10 }];
    const file = buildXlsxFile(rows);
    const result = await parseCatalogFile(file);
    expect(result.items.length).toBe(2);
    expect(result.skippedRows).toBe(1);
  });

  it("rechaza un archivo sin las columnas esperadas", async () => {
    const file = buildXlsxFile([{ Otra: "cosa" }]);
    await expect(parseCatalogFile(file)).rejects.toBeInstanceOf(CatalogParseError);
  });

  it("detecta el depósito por el texto de la columna Depot", async () => {
    const mnt = await parseCatalogFile(buildXlsxFile([
      { Depot: "Mantenimiento Supply Depot", "Item code": 1, "Item description": "(1) X", "MAX quantity": 4 }
    ]));
    expect(mnt.detectedWarehouse).toBe("SCN");

    const lib = await parseCatalogFile(buildXlsxFile([
      { Depot: "Library Supplies Depot P1 B3", "Item code": 1, "Item description": "(1) X", "MAX quantity": 4 }
    ]));
    expect(lib.detectedWarehouse).toBe("LIB");

    const bld = await parseCatalogFile(buildXlsxFile([
      { Depot: "Building Service Supply Depot", "Item code": 1, "Item description": "(1) X", "MAX quantity": 4 }
    ]));
    expect(bld.detectedWarehouse).toBe("BLDSRV");
  });

  it("detectedWarehouse es null si el texto de Depot no matchea ninguno conocido", async () => {
    const result = await parseCatalogFile(buildXlsxFile([
      { Depot: "Depósito Desconocido XYZ", "Item code": 1, "Item description": "(1) X", "MAX quantity": 4 }
    ]));
    expect(result.detectedWarehouse).toBeNull();
  });
});

describe("catalogsAreIdentical", () => {
  const base: InventoryItem[] = [{ codigo: "A", nombre: "Item A", minimo: 5, maximo: 20 }];

  it("true para listas idénticas", () => {
    expect(catalogsAreIdentical(base, [{ codigo: "A", nombre: "Item A", minimo: 5, maximo: 20 }])).toBe(true);
  });

  it("false si cambia el máximo", () => {
    expect(catalogsAreIdentical(base, [{ codigo: "A", nombre: "Item A", minimo: 5, maximo: 25 }])).toBe(false);
  });

  it("false si cambia la cantidad de ítems", () => {
    expect(catalogsAreIdentical(base, [])).toBe(false);
  });

  it("false si cambia el orden", () => {
    const a: InventoryItem[] = [
      { codigo: "A", nombre: "A", minimo: 0, maximo: 1 },
      { codigo: "B", nombre: "B", minimo: 0, maximo: 1 }
    ];
    const b: InventoryItem[] = [
      { codigo: "B", nombre: "B", minimo: 0, maximo: 1 },
      { codigo: "A", nombre: "A", minimo: 0, maximo: 1 }
    ];
    expect(catalogsAreIdentical(a, b)).toBe(false);
  });

  it("distingue bin presente de bin ausente", () => {
    const withBin: InventoryItem[] = [{ codigo: "A", nombre: "A", minimo: 0, maximo: 1, bin: "X" }];
    const withoutBin: InventoryItem[] = [{ codigo: "A", nombre: "A", minimo: 0, maximo: 1 }];
    expect(catalogsAreIdentical(withBin, withoutBin)).toBe(false);
  });
});

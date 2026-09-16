import { describe, expect, it } from "vitest";
import { computeOrderLines } from "../src/utils/order";
import type { InventoryItem } from "../src/types";

const catalog: InventoryItem[] = [
  { codigo: "A", nombre: "Item A", minimo: 10, maximo: 20 },
  { codigo: "B", nombre: "Item B", minimo: 5, maximo: 15 },
  { codigo: "C", nombre: "Item C", minimo: 3, maximo: 10 }
];

describe("computeOrderLines", () => {
  it("no pide nada si no hay conteos registrados", () => {
    expect(computeOrderLines(catalog, {})).toEqual([]);
  });

  it("no pide un ítem si lo contado es mayor al mínimo", () => {
    expect(computeOrderLines(catalog, { A: 15 })).toEqual([]);
  });

  it("pide (máximo - contado) cuando lo contado es menor al mínimo", () => {
    expect(computeOrderLines(catalog, { A: 4 })).toEqual([
      { codigo: "A", nombre: "Item A", cantidad: 16 }
    ]);
  });

  it("pide (máximo - contado) cuando lo contado es igual al mínimo", () => {
    expect(computeOrderLines(catalog, { A: 10 })).toEqual([
      { codigo: "A", nombre: "Item A", cantidad: 10 }
    ]);
  });

  it("un conteo de 0 (agotado) también dispara el pedido", () => {
    expect(computeOrderLines(catalog, { B: 0 })).toEqual([
      { codigo: "B", nombre: "Item B", cantidad: 15 }
    ]);
  });

  it("un mínimo de 0 dispara pedido si se cuenta exactamente 0", () => {
    const zeroMinCatalog: InventoryItem[] = [{ codigo: "Z", nombre: "Item Z", minimo: 0, maximo: 10 }];
    expect(computeOrderLines(zeroMinCatalog, { Z: 0 })).toEqual([
      { codigo: "Z", nombre: "Item Z", cantidad: 10 }
    ]);
  });

  it("un mínimo de 0 no dispara pedido si se cuenta más de 0", () => {
    const zeroMinCatalog: InventoryItem[] = [{ codigo: "Z", nombre: "Item Z", minimo: 0, maximo: 10 }];
    expect(computeOrderLines(zeroMinCatalog, { Z: 1 })).toEqual([]);
  });

  it("ignora ítems que no están en el catálogo filtrado", () => {
    expect(computeOrderLines(catalog, { Z: 0 })).toEqual([]);
  });

  it("combina varios ítems con y sin pedido en el mismo cálculo", () => {
    const result = computeOrderLines(catalog, { A: 4, B: 12, C: 0 });
    expect(result).toEqual([
      { codigo: "A", nombre: "Item A", cantidad: 16 },
      { codigo: "C", nombre: "Item C", cantidad: 10 }
    ]);
  });
});

import * as XLSX from "xlsx";
import { WAREHOUSE_FILE_SLUGS } from "../constants/warehouse";
import type { OrderLine, Warehouse } from "../types";

function safeCell(value: string | number): string | number {
  if (typeof value !== "string") return value;
  // Prevent spreadsheet formula injection on exported text fields.
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function exportOrder(warehouse: Warehouse, lines: OrderLine[]) {
  const rows = lines.map((line) => ({
    codigo: safeCell(line.codigo),
    nombre: safeCell(line.nombre),
    cantidad: line.cantidad
  }));

  const sheet = XLSX.utils.json_to_sheet(rows, { header: ["codigo", "nombre", "cantidad"] });
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Pedido");
  const date = new Intl.DateTimeFormat("es-AR", {
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date()).replaceAll("/", "-");
  XLSX.writeFile(book, `Pedido_${WAREHOUSE_FILE_SLUGS[warehouse]}_${date}.xlsx`, { bookType: "xlsx" });
}
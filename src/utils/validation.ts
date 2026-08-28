/**
 * @param allowZero Si es true, acepta 0 como valor válido (relevante para "cantidad
 * contada": encontrar un ítem completamente agotado es un resultado real, no un error).
 */
export function parseQuantity(value: string, opts?: { allowZero?: boolean }): number | null {
  if (value.trim() === "") return null;
  const normalized = value.trim().replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  const min = opts?.allowZero ? 0 : 1;
  if (n < min) return null;
  return n;
}
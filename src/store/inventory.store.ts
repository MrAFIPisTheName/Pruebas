import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Warehouse } from "../types";

interface InventoryState {
  warehouse: Warehouse | null;
  index: number;
  /** Cantidades contadas físicamente, por código de ítem. 0 es un valor válido (ítem agotado). */
  counts: Record<string, number>;
  setWarehouse: (warehouse: Warehouse) => void;
  setIndex: (index: number) => void;
  setCount: (codigo: string, cantidadContada: number) => void;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set) => ({
      warehouse: null,
      index: 0,
      counts: {},
      setWarehouse: (warehouse) => set({ warehouse, index: 0, counts: {} }),
      setIndex: (index) => set({ index }),
      // A diferencia del flujo anterior, acá SIEMPRE se guarda el valor (incluido 0):
      // un conteo de 0 es información real ("está agotado"), no equivale a "sin responder".
      setCount: (codigo, cantidadContada) =>
        set((state) => ({ counts: { ...state.counts, [codigo]: cantidadContada } })),
      reset: () => set({ warehouse: null, index: 0, counts: {} })
    }),
    {
      // Nombre nuevo a propósito: una sesión vieja guardaba "cantidad a pedir" bajo la
      // clave "answers", que ya no es compatible con el significado de "counts". Si
      // reutilizáramos el mismo nombre, una sesión a mitad de contar podría mezclar
      // números viejos (pedidos) interpretados como conteos, dando pedidos incorrectos.
      name: "warehouse-count-session"
    }
  )
);

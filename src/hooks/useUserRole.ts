import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { fetchUserRole, type Role } from "../services/firebase";

/**
 * `null` mientras se está leyendo (o si no hay usuario, o si no se pudo leer).
 * No hay estado de "cargando" separado a propósito: la UI que depende del rol
 * (ej. mostrar el botón de cargar catálogos) simplemente no aparece hasta que
 * se confirma el rol — más seguro que mostrarla optimistamente.
 */
export function useUserRole(user: User | null): Role | null {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setRole(null);
    if (!user) return;
    let cancelled = false;
    fetchUserRole(user).then((r) => {
      if (!cancelled) setRole(r);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return role;
}

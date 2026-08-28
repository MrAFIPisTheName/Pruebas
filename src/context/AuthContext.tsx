import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export const AuthContext = createContext<User | null>(null);

export function useAuthUser(): User | null {
  return useContext(AuthContext);
}

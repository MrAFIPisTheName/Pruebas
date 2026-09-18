import { FirebaseApp, FirebaseError, initializeApp, type FirebaseOptions } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Auth,
  type User
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore,
  setDoc,
  type Firestore
} from "firebase/firestore";
import type { InventoryItem, Warehouse } from "../types";

/**
 * Firebase Authentication (proveedor "Email/contraseña") pide un email como
 * identificador, pero acá se loguea por nombre de usuario. Este dominio
 * ficticio es solo una convención interna para armar ese identificador
 * (ej. "MFailde" -> "mfailde@deposito.local"); nunca se envía nada a ese
 * dominio ni existe de verdad. Tiene que coincidir con el email que se usa
 * al dar de alta a cada persona en la consola de Firebase (ver README).
 */
const USERNAME_DOMAIN = "deposito.local";

export type Role = "Administrador/a" | "Comprador/a" | "Mano de depósito";

/**
 * Solo el nombre "bonito" para mostrar en la UI — no es un secreto. El rol
 * YA NO vive acá: ahora es información real que se guarda en Firestore
 * (colección "roles"), porque además de mostrarse se usa para que las
 * Security Rules decidan quién puede reemplazar un catálogo. Si se agrega
 * gente nueva sin actualizar este mapa, el login sigue funcionando igual:
 * se muestra el usuario tal cual se escribió, sin nombre "bonito".
 */
const DISPLAY_NAMES: Record<string, string> = {
  mfailde: "MFailde",
  mcascone: "MCascone",
  gscrosoppi: "GScrosoppi",
  jguardia: "JGuardia",
  ezumaran: "EZumaran"
};

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${USERNAME_DOMAIN}`;
}

function localPart(user: User | null | undefined): string | null {
  if (!user?.email) return null;
  return user.email.split("@")[0];
}

export function displayNameFromUser(user: User | null | undefined): string {
  const local = localPart(user);
  if (!local) return "";
  return DISPLAY_NAMES[local] ?? local;
}

function readFirebaseConfig(): FirebaseOptions | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !authDomain || !projectId) return null;
  return { apiKey, authDomain, projectId, appId };
}

// Sentinel: `undefined` = todavía no se intentó inicializar; `null` = se
// intentó y no hay configuración válida (o initializeApp tiró una excepción).
// Auth y Firestore comparten la misma app: se inicializa una sola vez.
let appInstance: FirebaseApp | null | undefined;

function getFirebaseApp(): FirebaseApp | null {
  if (appInstance !== undefined) return appInstance;
  const config = readFirebaseConfig();
  if (!config) {
    appInstance = null;
    return appInstance;
  }
  try {
    appInstance = initializeApp(config);
  } catch {
    // Config mal copiada (ej. apiKey inválida): no debe tirar abajo toda la app,
    // solo dejar todo lo que depende de Firebase como "no configurado".
    appInstance = null;
  }
  return appInstance;
}

let authInstance: Auth | null | undefined;

function getFirebaseAuth(): Auth | null {
  if (authInstance !== undefined) return authInstance;
  const app = getFirebaseApp();
  authInstance = app ? getAuth(app) : null;
  return authInstance;
}

let dbInstance: Firestore | null | undefined;

function getFirebaseDb(): Firestore | null {
  if (dbInstance !== undefined) return dbInstance;
  const app = getFirebaseApp();
  dbInstance = app ? getFirestore(app) : null;
  return dbInstance;
}

export function isAuthConfigured(): boolean {
  return getFirebaseAuth() !== null;
}

export class AuthError extends Error {}

/**
 * @param rememberMe Si es true, la sesión sobrevive cerrar la app/pestaña (persistencia
 * local, comportamiento anterior). Por defecto la sesión se cierra sola al cerrar la
 * app: se guarda solo para la pestaña/ventana actual (persistencia de sesión).
 */
export async function loginWithUsername(
  username: string,
  password: string,
  rememberMe = false
): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new AuthError("La autenticación no está configurada en este despliegue.");
  try {
    await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    await signInWithEmailAndPassword(auth, usernameToEmail(username), password);
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : undefined;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      // Mensaje unificado a propósito: no distinguimos "usuario inexistente" de
      // "contraseña incorrecta" para no facilitar que alguien adivine qué usuarios existen.
      throw new AuthError("Usuario o contraseña incorrectos.");
    }
    if (code === "auth/too-many-requests") {
      throw new AuthError("Demasiados intentos. Esperá unos minutos e intentá de nuevo.");
    }
    if (code === "auth/network-request-failed") {
      throw new AuthError("No se pudo conectar. Revisá tu conexión a internet.");
    }
    throw new AuthError("No se pudo iniciar sesión. Intentá de nuevo.");
  }
}

export async function logout(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}

/** Devuelve una función de cleanup, pensada para usar dentro de un useEffect. */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

const VALID_ROLES: Role[] = ["Administrador/a", "Comprador/a", "Mano de depósito"];

/**
 * Lee el rol desde Firestore (colección "roles", documento = nombre de
 * usuario en minúscula). `null` si no está configurado, si el documento no
 * existe, o ante cualquier error de red — nunca lanza, porque el rol es
 * usado para decidir qué mostrar en la UI y una falla acá no debe romper
 * el resto de la app (la restricción real de todas formas la aplica
 * Firestore del lado del servidor, no esta lectura).
 */
export async function fetchUserRole(user: User | null | undefined): Promise<Role | null> {
  const local = localPart(user);
  if (!local) return null;
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "roles", local));
    if (!snap.exists()) return null;
    const role = snap.data()?.role;
    return VALID_ROLES.includes(role) ? (role as Role) : null;
  } catch {
    return null;
  }
}

export function isCatalogStoreConfigured(): boolean {
  return getFirebaseDb() !== null;
}

/**
 * Catálogo guardado en Firestore para un depósito, si algún administrador ya
 * reemplazó la lista original en algún momento. `null` si nunca se cargó
 * nada ahí (usar el catálogo incluido en el build) o ante cualquier error
 * (sin conexión, Firestore no configurado, etc.) — nunca lanza, para que la
 * app pueda seguir funcionando offline con los datos del build.
 */
export async function fetchCatalogOverride(warehouse: Warehouse): Promise<InventoryItem[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "catalogs", warehouse));
    if (!snap.exists()) return null;
    const items = snap.data()?.items;
    return Array.isArray(items) ? (items as InventoryItem[]) : null;
  } catch {
    return null;
  }
}

export class CatalogUploadError extends Error {}

/**
 * Reemplaza en Firestore la lista de un depósito. Solo funciona si la cuenta
 * logueada tiene rol Administrador/a en la colección "roles" — eso lo exige
 * la Security Rule del lado del servidor (ver README), así que aunque esta
 * función se llame igual, Firestore la va a rechazar para cualquier otra
 * cuenta.
 */
export async function replaceCatalog(
  warehouse: Warehouse,
  items: InventoryItem[],
  updatedByLabel: string
): Promise<void> {
  const db = getFirebaseDb();
  if (!db) throw new CatalogUploadError("La base de datos no está configurada en este despliegue.");
  try {
    await setDoc(doc(db, "catalogs", warehouse), {
      items,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedByLabel
    });
  } catch (err) {
    const code = err instanceof FirebaseError ? err.code : undefined;
    if (code === "permission-denied") {
      throw new CatalogUploadError("No tenés permiso para reemplazar esta lista (se requiere rol Administrador/a).");
    }
    if (code === "unavailable") {
      throw new CatalogUploadError("No se pudo conectar. Revisá tu conexión a internet.");
    }
    throw new CatalogUploadError("No se pudo guardar la lista nueva. Intentá de nuevo.");
  }
}

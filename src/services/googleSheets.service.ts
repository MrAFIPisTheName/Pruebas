import type { OrderLine, Warehouse } from "../types";
import { warehouseLabel } from "../constants/warehouse";

const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export class GoogleSheetsConfigError extends Error {}
export class GoogleSheetsAuthError extends Error {}
export class GoogleSheetsApiError extends Error {}

let cachedToken: { value: string; expiresAt: number } | null = null;

function getConfig() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  const range = import.meta.env.VITE_GOOGLE_SHEET_RANGE || "Pedidos!A1";
  if (!clientId || !spreadsheetId) {
    throw new GoogleSheetsConfigError(
      "Falta configurar VITE_GOOGLE_CLIENT_ID y VITE_GOOGLE_SHEET_ID (ver README)."
    );
  }
  return { clientId, spreadsheetId, range };
}

/** Confirma que el script de Google Identity Services haya cargado (puede fallar por bloqueadores de anuncios, sin red, etc). */
function ensureGisLoaded(): GoogleIdentityServices {
  if (!window.google?.accounts?.oauth2) {
    throw new GoogleSheetsConfigError(
      "No se pudo cargar el inicio de sesión de Google. Verificá tu conexión a internet " +
      "o si un bloqueador de contenido está impidiendo cargar " + GIS_SCRIPT_SRC + "."
    );
  }
  return window.google;
}

/**
 * Pide (o reutiliza) un token de acceso. Abre un popup de Google la primera vez
 * o cuando el token anterior expiró; el usuario debe tener sesión de Google y
 * permiso de edición sobre la planilla configurada.
 */
function requestAccessToken(clientId: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return Promise.resolve(cachedToken.value);
  }

  const google = ensureGisLoaded();

  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new GoogleSheetsAuthError(
            response.error_description || response.error || "No se pudo iniciar sesión con Google."
          ));
          return;
        }
        // Los tokens de GIS duran ~1 hora; los reutilizamos con margen de seguridad de 2 minutos.
        cachedToken = { value: response.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
        resolve(response.access_token);
      },
      error_callback: (error) => {
        // Se dispara si el usuario cierra el popup o si el navegador lo bloquea.
        reject(new GoogleSheetsAuthError(
          error.type === "popup_closed"
            ? "Se cerró la ventana de inicio de sesión de Google antes de completar el acceso."
            : error.message || "No se pudo abrir el inicio de sesión de Google (¿popup bloqueado?)."
        ));
      }
    });
    try {
      client.requestAccessToken();
    } catch (err) {
      reject(new GoogleSheetsAuthError(err instanceof Error ? err.message : "Error inesperado al iniciar sesión con Google."));
    }
  });
}

function buildRows(warehouse: Warehouse, lines: OrderLine[]): (string | number)[][] {
  const timestamp = new Date().toISOString();
  const depositLabel = warehouseLabel(warehouse);
  return lines.map((line) => [timestamp, depositLabel, line.codigo, line.nombre, line.cantidad]);
}

async function appendRows(accessToken: string, spreadsheetId: string, range: string, rows: (string | number)[][]) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ values: rows })
    });
  } catch {
    throw new GoogleSheetsApiError("No se pudo conectar con Google Sheets. Revisá tu conexión a internet.");
  }

  if (res.status === 401) {
    // Token vencido o revocado: lo descartamos para forzar un nuevo login la próxima vez.
    cachedToken = null;
    throw new GoogleSheetsAuthError("La sesión de Google expiró. Probá subir el pedido de nuevo.");
  }
  if (res.status === 403) {
    throw new GoogleSheetsAuthError(
      "Tu cuenta de Google no tiene permiso de edición sobre esta planilla. Pedile a quien la administra que te comparta acceso."
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {
      // si la respuesta de error no es JSON válido, seguimos sin detalle adicional
    }
    throw new GoogleSheetsApiError(`Google Sheets devolvió un error (${res.status}). ${detail}`.trim());
  }
}

/**
 * Sube las líneas del pedido a la Google Sheet configurada, agregando filas
 * nuevas (nunca sobreescribe lo que ya haya cargado otro usuario).
 */
export async function uploadOrderToGoogleSheets(warehouse: Warehouse, lines: OrderLine[]): Promise<void> {
  if (lines.length === 0) {
    throw new GoogleSheetsApiError("No hay cantidades pedidas para subir.");
  }
  const { clientId, spreadsheetId, range } = getConfig();
  const accessToken = await requestAccessToken(clientId);
  const rows = buildRows(warehouse, lines);
  await appendRows(accessToken, spreadsheetId, range, rows);
}

/** Permite a la UI saber de antemano si la función está configurada, para mostrar u ocultar el botón. */
export function isGoogleSheetsConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_SHEET_ID);
}

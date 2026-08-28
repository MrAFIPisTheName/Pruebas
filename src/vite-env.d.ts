/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** OAuth 2.0 Client ID creado en Google Cloud Console (tipo "Web application"). */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** ID de la Google Sheet (el valor entre /d/ y /edit en su URL). */
  readonly VITE_GOOGLE_SHEET_ID?: string;
  /** Rango de destino, ej. "Pedidos!A1" (nombre de pestaña + celda de inicio). */
  readonly VITE_GOOGLE_SHEET_RANGE?: string;
  /** Config del proyecto de Firebase (todos de "Configuración del proyecto" en la consola). */
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

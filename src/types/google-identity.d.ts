/**
 * Tipado mínimo para Google Identity Services (GIS), cargado en index.html vía
 * <script src="https://accounts.google.com/gsi/client">. Google no publica un
 * paquete de tipos oficial para este script global, así que declaramos acá
 * únicamente lo que usamos.
 */
interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleIdentityServices {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type: string; message?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
}

interface Window {
  google?: GoogleIdentityServices;
}

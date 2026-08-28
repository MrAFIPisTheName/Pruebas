import { afterEach, describe, expect, it, vi } from "vitest";
import { GoogleSheetsApiError, GoogleSheetsConfigError, isGoogleSheetsConfigured, uploadOrderToGoogleSheets } from "../src/services/googleSheets.service";

describe("googleSheets.service", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isGoogleSheetsConfigured es false sin variables de entorno", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("VITE_GOOGLE_SHEET_ID", "");
    expect(isGoogleSheetsConfigured()).toBe(false);
  });

  it("isGoogleSheetsConfigured es true con ambas variables presentes", () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("VITE_GOOGLE_SHEET_ID", "sheet-id");
    expect(isGoogleSheetsConfigured()).toBe(true);
  });

  it("rechaza con GoogleSheetsApiError si no hay líneas para subir", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "client-id");
    vi.stubEnv("VITE_GOOGLE_SHEET_ID", "sheet-id");
    await expect(uploadOrderToGoogleSheets("SAN", [])).rejects.toBeInstanceOf(GoogleSheetsApiError);
  });

  it("rechaza con GoogleSheetsConfigError si faltan variables de entorno", async () => {
    vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "");
    vi.stubEnv("VITE_GOOGLE_SHEET_ID", "");
    await expect(
      uploadOrderToGoogleSheets("SAN", [{ codigo: "1", nombre: "Item", cantidad: 5 }])
    ).rejects.toBeInstanceOf(GoogleSheetsConfigError);
  });
});

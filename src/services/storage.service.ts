export const STORAGE_KEY = "warehouse-count-session";

export function clearSavedSession() {
  localStorage.removeItem(STORAGE_KEY);
}
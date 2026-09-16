import { test, expect } from "@playwright/test";

/**
 * El login ahora es autenticación real contra Firebase (no una contraseña
 * fija en el código), así que estos tests necesitan credenciales de un
 * usuario que exista de verdad en el proyecto de Firebase configurado —
 * idealmente un usuario de prueba dedicado, no las cuentas reales del
 * equipo. Se leen de variables de entorno (nunca hardcodeadas acá) y, si
 * no están seteadas, los tests se saltean con un mensaje claro en vez de
 * fallar de forma confusa.
 *
 * Correr con:
 *   E2E_USERNAME=usuario-de-prueba E2E_PASSWORD=su-contraseña npm run e2e
 */
const E2E_USERNAME = process.env.E2E_USERNAME;
const E2E_PASSWORD = process.env.E2E_PASSWORD;

test.beforeEach(async () => {
  test.skip(
    !E2E_USERNAME || !E2E_PASSWORD,
    "Faltan E2E_USERNAME / E2E_PASSWORD (ver comentario al inicio de este archivo)."
  );
});

async function login(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByLabel("Usuario").fill(E2E_USERNAME!);
  await page.getByLabel("Contraseña").fill(E2E_PASSWORD!);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page.getByLabel("Usuario")).toHaveCount(0);
}

test("seleccionar depósito, contar un ítem y ver el pedido calculado", async ({ page }) => {
  await login(page);
  await page.getByLabel("Supply depot FOOD").check();
  await page.getByRole("button", { name: "Comenzar" }).click();
  await expect(page.getByText("Pedido Supply depot FOOD")).toBeVisible();

  // El primer ítem de san.json (ahora el catálogo Kitchen) es "CAFÉ; tostado en
  // grano, Gourmet", máximo 300 → mínimo 75 (25% de 300, ya múltiplo de 5).
  await expect(page.getByText("1020291")).toBeVisible();

  // La interacción es por gesto (swipe), no por botón: simulamos un arrastre hacia la
  // derecha con el mouse (los handlers usan Pointer Events, que también cubren mouse).
  const card = page.locator(".MuiCard-root").first();
  const box = await card.boundingBox();
  if (!box) throw new Error("No se encontró la tarjeta del ítem.");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();

  // Contamos 0 unidades (agotado): al ser menor al mínimo (75), debe pedirse
  // (máximo - contado) = 300 - 0 = 300.
  await page.getByLabel("Cantidad contada").fill("0");
  await page.getByRole("button", { name: "Confirmar" }).click();

  await page.getByRole("button", { name: "Ver resumen" }).click();
  await expect(page.getByText("1020291")).toBeVisible();
  await expect(page.getByText("300")).toBeVisible();
});

test("volver atrás conserva el conteo y lo precarga para editar", async ({ page }) => {
  await login(page);
  await page.getByLabel("Supply depot FOOD").check();
  await page.getByRole("button", { name: "Comenzar" }).click();

  const dragRight = async () => {
    const card = page.locator(".MuiCard-root").first();
    const box = await card.boundingBox();
    if (!box) throw new Error("No se encontró la tarjeta del ítem.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 150, box.y + box.height / 2, { steps: 10 });
    await page.mouse.up();
  };

  // Primer ítem (1020291): contamos 0 y avanzamos al segundo ítem (1011775).
  await expect(page.getByText("1020291")).toBeVisible();
  await dragRight();
  await page.getByLabel("Cantidad contada").fill("0");
  await page.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("1011775")).toBeVisible();

  // "Ítem anterior" debe volver al primer ítem y mostrar que ya tiene un conteo (0) guardado.
  await page.getByRole("button", { name: "Ítem anterior" }).click();
  await expect(page.getByText("1020291")).toBeVisible();
  await expect(page.getByText(/Contado: 0/)).toBeVisible();

  // Al reabrir el modal para ese mismo ítem, el campo debe venir precargado con "0"
  // (no vacío) — así "Cancelar" significa "dejarlo como estaba".
  await dragRight();
  await expect(page.getByLabel("Cantidad contada")).toHaveValue("0");

  // Lo editamos a 10 y confirmamos: el conteo del primer ítem debe actualizarse.
  await page.getByLabel("Cantidad contada").fill("10");
  await page.getByRole("button", { name: "Confirmar" }).click();

  await page.getByRole("button", { name: "Ver resumen" }).click();
  // (máximo - contado) = 300 - 10 = 290, ya no 300.
  await expect(page.getByText("1020291")).toBeVisible();
  await expect(page.getByText("290")).toBeVisible();
});

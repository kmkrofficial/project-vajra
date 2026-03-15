import { test, expect } from "@playwright/test";
import {
  createTestUser,
  seedWorkspaceForUser,
  cleanupTestData,
  getTestDb,
  loginAndSelectWorkspace,
} from "./helpers";

// ─── Test Data ──────────────────────────────────────────────────────────────

const OWNER = {
  name: "Settings Owner",
  email: `e2e-settings-${Date.now()}@test.local`,
  password: "TestPassword123!",
};

let userId: string;
let workspaceId: string;

// ─── Setup / Teardown ───────────────────────────────────────────────────────

test.describe("Settings – UPI QR & WhatsApp Template", () => {
  test.beforeAll(async () => {
    userId = await createTestUser(OWNER);
    const seeded = await seedWorkspaceForUser(userId);
    workspaceId = seeded.workspaceId;
  });

  test.afterAll(async () => {
    if (workspaceId) await cleanupTestData(workspaceId);
    const sql = getTestDb();
    await sql`DELETE FROM "user" WHERE email = ${OWNER.email}`;
    await sql.end();
  });

  // ─── UPI Handle ──────────────────────────────────────────────────────────

  test("UPI handle section is visible with current value", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    await expect(page.getByTestId("upi-handle-section")).toBeVisible();
    const input = page.getByTestId("upi-handle-input");
    await expect(input).toBeVisible();
    // Seeded workspace has 'testowner@upi' — save button should be disabled (no changes)
    await expect(page.getByTestId("upi-handle-save-btn")).toBeDisabled();
  });

  test("can update UPI handle", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    const input = page.getByTestId("upi-handle-input");
    await input.clear();
    await input.fill("newowner@okaxis");

    // Save button should be enabled
    await expect(page.getByTestId("upi-handle-save-btn")).toBeEnabled();
    await page.getByTestId("upi-handle-save-btn").click();
    await expect(page.getByText("UPI handle updated")).toBeVisible({ timeout: 10_000 });

    // Verify persistence — reload page
    await page.reload();
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId("upi-handle-input")).toHaveValue("newowner@okaxis");
  });

  // ─── UPI QR Code Upload ─────────────────────────────────────────────────

  test("UPI QR upload section is visible on settings page", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // UPI QR upload section should be visible
    await expect(page.getByTestId("upi-qr-upload-section")).toBeVisible();
    // Upload button should be present (no image uploaded yet)
    await expect(page.getByTestId("upi-qr-upload-btn")).toBeVisible();
  });

  test("can upload a QR image and see preview", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // Create a minimal 1x1 PNG as test image
    const fileInput = page.getByTestId("upi-qr-file-input");

    // Upload a small test image via file chooser
    await fileInput.setInputFiles({
      name: "test-qr.png",
      mimeType: "image/png",
      // Minimal 1x1 white PNG (68 bytes)
      buffer: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",
        "base64"
      ),
    });

    // Wait for success toast
    await expect(page.getByText("UPI QR code saved")).toBeVisible({ timeout: 10_000 });

    // Preview image should now be visible
    await expect(page.getByTestId("upi-qr-preview")).toBeVisible();

    // Replace and Remove buttons should appear
    await expect(page.getByTestId("upi-qr-replace-btn")).toBeVisible();
    await expect(page.getByTestId("upi-qr-remove-btn")).toBeVisible();
  });

  test("can remove uploaded QR image", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // If the QR was uploaded in the previous test, the preview should be visible
    // (tests run sequentially in a describe block)
    const removeBtn = page.getByTestId("upi-qr-remove-btn");

    if (await removeBtn.isVisible()) {
      await removeBtn.click();
      await expect(page.getByText("UPI QR code removed")).toBeVisible({ timeout: 10_000 });

      // Should revert to upload button
      await expect(page.getByTestId("upi-qr-upload-btn")).toBeVisible();
    }
  });

  // ─── WhatsApp Message Template ──────────────────────────────────────────

  test("WhatsApp template section is visible with preview", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // WhatsApp template section
    await expect(page.getByTestId("whatsapp-template-section")).toBeVisible();
    await expect(page.getByTestId("whatsapp-template-input")).toBeVisible();
    await expect(page.getByTestId("whatsapp-template-preview")).toBeVisible();

    // Save button should be disabled (no changes)
    await expect(page.getByTestId("whatsapp-template-save-btn")).toBeDisabled();
  });

  test("can set a custom WhatsApp template and save", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    const input = page.getByTestId("whatsapp-template-input");
    const saveBtn = page.getByTestId("whatsapp-template-save-btn");

    // Type a custom template
    await input.fill("Hello {name}! Renew your {gym} membership (₹{amount}). Pay here: {upiLink}");

    // Save button should now be enabled
    await expect(saveBtn).toBeEnabled();

    // Preview should update with sample data
    await expect(page.getByTestId("whatsapp-template-preview")).toContainText("Hello John!");
    await expect(page.getByTestId("whatsapp-template-preview")).toContainText("FitZone Gym");

    // Save
    await saveBtn.click();
    await expect(page.getByText("WhatsApp template saved")).toBeVisible({ timeout: 10_000 });
  });

  test("can reset WhatsApp template to default", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    const input = page.getByTestId("whatsapp-template-input");

    // If there's a saved template, the reset button should appear
    const resetBtn = page.getByTestId("whatsapp-template-reset-btn");

    if (await resetBtn.isVisible()) {
      await resetBtn.click();
      // Input should be cleared
      await expect(input).toHaveValue("");

      // Save the reset (empty = default)
      const saveBtn = page.getByTestId("whatsapp-template-save-btn");
      await saveBtn.click();
      await expect(page.getByText("WhatsApp template reset to default")).toBeVisible({ timeout: 10_000 });
    }
  });

  // ─── Persistence Check ──────────────────────────────────────────────────

  test("WhatsApp template persists across page reloads", async ({ page }) => {
    await loginAndSelectWorkspace(page, OWNER, expect);
    await page.goto("/app/settings");
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    const input = page.getByTestId("whatsapp-template-input");
    const saveBtn = page.getByTestId("whatsapp-template-save-btn");

    // Set a known template
    const template = "Reminder: {name}, renew at {gym} for ₹{amount}";
    await input.fill(template);
    await saveBtn.click();
    await expect(page.getByText("WhatsApp template saved")).toBeVisible({ timeout: 10_000 });

    // Reload page
    await page.reload();
    await expect(page.getByTestId("settings-page")).toBeVisible({ timeout: 10_000 });

    // Template should persist
    await expect(page.getByTestId("whatsapp-template-input")).toHaveValue(template);
  });
});

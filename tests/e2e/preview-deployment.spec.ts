import { test, expect, Page } from "@playwright/test";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function signInWithGoogle(page: Page, email: string, password: string) {
  await test.step("Open login page and start Google sign-in", async () => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Sign in with Google" }).click();
  });

  await test.step("Authenticate in Google account screen", async () => {
    await page.waitForURL(/accounts\.google\.com|google\.com/, { timeout: 60_000 });

    const emailInput = page.locator('input[type="email"], input[name="identifier"]');
    if (await emailInput.count()) {
      await emailInput.first().fill(email);
      await page.getByRole("button", { name: /next/i }).first().click();
    }

    const passwordInput = page.locator('input[type="password"], input[name="Passwd"]');
    await passwordInput.first().fill(password);
    await page.getByRole("button", { name: /next/i }).first().click();
  });

  await test.step("Wait for redirect back to preview deployment", async () => {
    const previewUrl = requireEnv("PREVIEW_URL");
    await page.waitForURL(new RegExp(`^${previewUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`), {
      timeout: 90_000,
    });
  });
}

async function assertSyllabusesVisible(page: Page) {
  await test.step("Open syllabuses page", async () => {
    await page.goto("/super-admin/syllabuses");

    const isSuperAdminView = await page
      .getByRole("heading", { name: "Manage Syllabuses" })
      .count();

    if (!isSuperAdminView) {
      await page.goto("/admin/syllabuses");
      await expect(page.getByRole("heading", { name: "Browse Syllabuses" })).toHaveText(
        "Browse Syllabuses",
      );

      const adminCards = page.locator(".card-grid .card");
      await expect(adminCards.first()).toContainText(/./);
      return;
    }

    await expect(page.getByRole("heading", { name: "Manage Syllabuses" })).toHaveText(
      "Manage Syllabuses",
    );

    const rows = page.locator("tbody tr");
    await expect(rows.first()).toContainText(/./);
  });
}

test.describe("Preview deployment - Google sign-in", () => {
  test("Google sign-in lands on authenticated app and shows syllabuses", async ({ page }) => {
    const previewUrl = requireEnv("PREVIEW_URL");
    const googleEmail = requireEnv("E2E_GOOGLE_EMAIL");
    const googlePassword = requireEnv("E2E_GOOGLE_PASSWORD");

    test.setTimeout(180_000);

    await page.goto(previewUrl);
    await signInWithGoogle(page, googleEmail, googlePassword);
    await assertSyllabusesVisible(page);
  });
});

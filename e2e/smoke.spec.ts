import { test, expect } from "@playwright/test";

test.describe("KSYK Maps smoke tests", () => {
  test("home page loads map without bottom navigation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /KSYK Maps/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /2D Map/i })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Campus navigation" })).toHaveCount(0);
  });

  test("Nordbyte Studio credits visible on landing", async ({ page }) => {
    await page.goto("/landing");
    await expect(page.getByText(/Nordbyte Studio/i).first()).toBeVisible();
  });

  test("classic map route still available", async ({ page }) => {
    await page.goto("/classic");
    await expect(page.getByRole("heading", { name: /KSYK Maps/i })).toBeVisible();
  });
});

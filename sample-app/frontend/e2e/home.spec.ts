import { test, expect } from "@playwright/test";

test("shows the page heading", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "loop-basic sample app" })).toBeVisible();
});

import { expect, test } from "@playwright/test";

/**
 * Browser smoke tests for Sunpath.
 *
 * The happy-dom suite in `tests/` covers the game logic and the components;
 * these checks cover what only a real browser shows: the bundle boots, a
 * round is playable, and the layout fits a laptop without sideways scroll.
 *
 * Laptop viewport: 1366x768 minus browser chrome, the common reviewer size.
 */

const LAPTOP = { width: 1280, height: 757 };

test("the app boots in a real browser", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await expect(page.locator("#root")).not.toBeEmpty();
  await expect(page.getByRole("heading", { name: /Sunpath/ })).toBeVisible();
  await expect(page).toHaveTitle(/Sunpath/);

  // An uncaught exception on load is a failure even if the markup looks fine.
  expect(pageErrors).toEqual([]);
});

test("a round can be played through the browser", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");

  await page.getByRole("button", { name: "Start" }).click();
  await expect(page.getByText("Round 1 / 8")).toBeVisible();
  await expect(page.getByRole("img")).toBeVisible();

  await page.getByLabel("Your latitude guess").fill("60");
  await expect(page.getByText("60.0° N")).toBeVisible();

  await page.getByRole("button", { name: "Submit guess" }).click();
  await expect(page.getByText(/off,/)).toBeVisible();
  await expect(page.getByText(/Longest day:/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next round" })).toBeVisible();
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.setViewportSize(LAPTOP);
  await page.goto("/");
  await page.getByRole("button", { name: "Start" }).click();

  const doc = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement?.scrollWidth ?? 0,
    innerWidth: window.innerWidth,
  }));
  expect(doc.scrollWidth).toBeLessThanOrEqual(doc.innerWidth);
});

import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { validateBytes } from "gltf-validator";
async function downloadAvatar(page: Page) {
  const wait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export GLB" }).click();
  const bytes = await readFile((await (await wait).path())!);
  const jsonSize = bytes.readUInt32LE(12),
    json = JSON.parse(bytes.toString("utf8", 20, 20 + jsonSize));
  const report = await validateBytes(new Uint8Array(bytes));
  expect(report.issues.numErrors, JSON.stringify(report.issues.messages)).toBe(
    0,
  );
  const view = json.bufferViews[json.images[0].bufferView],
    start = 28 + jsonSize + (view.byteOffset || 0);
  return { json, face: bytes.subarray(start, start + view.byteLength) };
}
test("automatic get-up repeats and styled avatars preserve the same photo through export and play", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page
    .getByLabel("Upload a portrait")
    .setInputFiles("tests/fixtures/astronaut.png");
  await page.getByLabel("Crop zoom").fill("1.5");
  await page.getByLabel("Crop vertical position").fill("0");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate my character" }).click();
  await expect(
    page.getByRole("heading", { name: "Looking like you." }),
  ).toBeVisible({ timeout: 90000 });
  const original = await downloadAvatar(page);
  const wardrobe = page.getByRole("region", { name: "Character wardrobe" });
  await expect(wardrobe).toBeVisible();
  expect(
    await page.getByLabel("Outfit", { exact: true }).locator("option").count(),
  ).toBe(13);
  expect(
    await page
      .getByLabel("Hairstyle", { exact: true })
      .locator("option")
      .count(),
  ).toBe(13);
  await page.getByLabel("Outfit", { exact: true }).selectOption("dress");
  await page.getByLabel("Hairstyle", { exact: true }).selectOption("long");
  await page.getByLabel("Outfit color", { exact: true }).fill("#346ac1");
  await page.getByLabel("Hair color", { exact: true }).fill("#59270f");
  await expect(page.locator(".arena")).toHaveAttribute("aria-busy", "false");
  const dress = await downloadAvatar(page);
  expect(dress.face.equals(original.face)).toBe(true);
  expect(
    dress.json.nodes.find(
      (n: { extras?: { appearance: unknown } }) => n.extras?.appearance,
    ).extras.appearance,
  ).toEqual({
    outfit: "dress",
    hairstyle: "long",
    outfitColor: "#346ac1",
    hairColor: "#59270f",
  });
  await page.screenshot({
    path: testInfo.outputPath("dress-and-long-hair.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Let’s make some chaos" }).click();
  for (let hit = 0; hit < 3; hit++) {
    await expect(page.locator(".arena")).toHaveAttribute("aria-busy", "false");
    await expect(page.locator(".arena")).toHaveAttribute(
      "data-motion",
      "ready",
    );
    await page.locator(".arena").scrollIntoViewIfNeeded();
    const rect = (await page.locator(".arena canvas").boundingBox())!;
    const before = await page.getByTestId("score").innerText();
    await page.mouse.click(
      rect.x + rect.width / 2,
      rect.y + rect.height * 0.42,
    );
    await expect(page.getByTestId("score")).not.toHaveText(before);
    await expect(page.locator(".arena")).toHaveAttribute(
      "data-motion",
      "ragdoll",
    );
    // No reset button or R key: actual physics bodies must return to standing automatically.
    await expect(page.locator(".arena")).toHaveAttribute(
      "data-motion",
      "ready",
      { timeout: 10000 },
    );
    await expect(page.getByLabel("Outfit", { exact: true })).toHaveValue(
      "dress",
    );
  }
  const score = await page.getByTestId("score").innerText();
  await page.getByLabel("Outfit", { exact: true }).selectOption("suit");
  await page.getByLabel("Hairstyle", { exact: true }).selectOption("quiff");
  await expect(page.getByTestId("score")).toHaveText(score);
  const suit = await downloadAvatar(page);
  expect(suit.face.equals(original.face)).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("suit-and-quiff.png"),
    fullPage: true,
  });
  // Gravity must expire and recovery must restore ordinary, repeatable interaction.
  await page.getByRole("button", { name: /7 Gravity control/ }).click();
  await page.locator(".arena").scrollIntoViewIfNeeded();
  const box = (await page.locator(".arena canvas").boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
  await expect(page.getByTestId("score")).not.toHaveText(score);
  await expect(page.locator(".arena")).toHaveAttribute(
    "data-motion",
    "ragdoll",
  );
  await expect(page.locator(".arena")).toHaveAttribute("data-motion", "ready", {
    timeout: 12000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await wardrobe.scrollIntoViewIfNeeded();
  await page.getByLabel("Outfit", { exact: true }).selectOption("sari");
  await page.getByLabel("Hairstyle", { exact: true }).selectOption("braids");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "Reset look" }).click();
  await expect(page.getByLabel("Outfit", { exact: true })).toHaveValue(
    "tracksuit",
  );
  await expect(page.getByLabel("Hairstyle", { exact: true })).toHaveValue(
    "short",
  );
  expect(errors).toEqual([]);
});

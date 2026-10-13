import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { validateBytes } from "gltf-validator";
test("real portrait → landmark reconstruction → GLB → physics → deletion", async ({
  page,
}, testInfo) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.log("BROWSER:", m.text());
  });
  const outgoingPhotos: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") outgoingPhotos.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Your face. Full chaos." }),
  ).toBeVisible();
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: testInfo.outputPath("landing.png"),
    fullPage: true,
  });
  await expect(
    page.getByRole("button", { name: "Generate my character" }),
  ).toBeDisabled();
  await page
    .getByLabel("Upload a portrait")
    .setInputFiles("tests/fixtures/astronaut.png");
  await page.getByLabel("Crop zoom").fill("1.5");
  await page.getByLabel("Crop vertical position").fill("0");
  await expect(
    page.getByRole("button", { name: "Generate my character" }),
  ).toBeDisabled();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate my character" }).click();
  await expect(
    page.getByRole("heading", { name: "Looking like you." }),
  ).toBeVisible({ timeout: 90000 });
  await expect(page.getByText("468 facial landmarks")).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("generated.png"),
    fullPage: true,
  });
  for (const view of ["side", "back", "front"])
    await page.getByRole("button", { name: view, exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export GLB" }).click();
  const download = await downloaded;
  const file = await readFile((await download.path())!);
  const validation = await validateBytes(new Uint8Array(file));
  expect(
    validation.issues.numErrors,
    JSON.stringify(validation.issues.messages),
  ).toBe(0);
  expect(file.toString("ascii", 0, 4)).toBe("glTF");
  expect(file.readUInt32LE(4)).toBe(2);
  const jsonLength = file.readUInt32LE(12),
    gltf = JSON.parse(file.toString("utf8", 20, 20 + jsonLength));
  expect(gltf.skins[0].joints.length).toBe(11);
  expect(gltf.images.length).toBeGreaterThan(0);
  expect(gltf.animations[0].name).toBe("Gentle idle");
  await page.getByRole("button", { name: "Let’s make some chaos" }).click();
  await expect(page.getByTestId("score")).toHaveText("00000");
  await expect(page.locator(".arena")).toHaveAttribute("aria-busy","false");
  const canvas = page.locator(".arena canvas");
  const box = (await canvas.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
  await expect(page.getByTestId("score")).not.toHaveText("00000");
  await expect(
    page.getByText("Beautiful chaos. Press R to go again."),
  ).toBeVisible();
  await page.waitForTimeout(900);
  await page.screenshot({
    path: testInfo.outputPath("physics.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset character" }).click();
    await expect(page.locator(".arena")).toHaveAttribute("aria-busy","false");
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
      ),
  );
  await expect(
    page.getByText("Choose a tool. Click your character. Let loose."),
  ).toBeVisible();
  await page.keyboard.press("5");
  await expect(
    page.getByRole("button", { name: /5.*Spring launcher/ }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
  await page.waitForTimeout(700);
  await page.keyboard.press("r");
  for (const key of ["2", "3", "4", "6", "7", "8", "9"]) {
    await page.getByRole("button", { name: "Reset character" }).click();
    await expect(page.locator(".arena")).toHaveAttribute("aria-busy","false");
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() =>
            requestAnimationFrame(() => resolve(null)),
          ),
        ),
    );
    await page.keyboard.press(key);
    const before = await page.getByTestId("score").innerText();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.42);
    await expect(page.getByTestId("score")).not.toHaveText(before);
    await expect(
      page.getByText("Beautiful chaos. Press R to go again."),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Restart game" }).click();
  await expect(page.getByTestId("score")).toHaveText("00000");
  await page.getByRole("button", { name: "Delete photo & avatar" }).click();
  await expect(
    page.getByRole("heading", { name: "Make it you." }),
  ).toBeVisible();
  await expect(page.getByAltText("Your cropped portrait")).toHaveCount(0);
  // A photograph of a different person must generate a distinct avatar.
  await page
    .getByLabel("Upload a portrait")
    .setInputFiles("tests/fixtures/grace_hopper.jpg");
  await page.getByLabel("Crop zoom").fill("1");
  await page.getByLabel("Crop vertical position").fill("0");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate my character" }).click();
  await expect(
    page.getByRole("heading", { name: "Looking like you." }),
  ).toBeVisible({ timeout: 90000 });
  const nextDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export GLB" }).click();
  const nextFile = await readFile((await (await nextDownload).path())!);
  expect(nextFile.equals(file)).toBe(false);
  await page.screenshot({path:testInfo.outputPath("second-person.png"),fullPage:true});
  expect(outgoingPhotos).toEqual([]);
  expect(failures).toEqual([]);
});
test("invalid files and no-face images fail honestly", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Upload a portrait")
    .setInputFiles({
      name: "fake.jpg",
      mimeType: "image/jpeg",
      buffer: Buffer.from("not an image"),
    });
  await expect(page.getByRole("alert")).toContainText("real JPEG");
  const blank = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    c.getContext("2d")!.fillRect(0, 0, 512, 512);
    return c.toDataURL("image/png").split(",")[1];
  });
  await page
    .getByLabel("Upload a portrait")
    .setInputFiles({
      name: "blank.png",
      mimeType: "image/png",
      buffer: Buffer.from(blank, "base64"),
    });
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Generate my character" }).click();
  await expect(page.getByRole("alert")).toContainText("No clear face", {
    timeout: 90000,
  });
  await expect(
    page.getByRole("heading", { name: "Make it you." }),
  ).toBeVisible();
});
test("mobile layout fits the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Drop your photo here" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
});

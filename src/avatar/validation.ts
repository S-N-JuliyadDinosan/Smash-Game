export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export function validateImageBytes(bytes: Uint8Array, size: number) {
  if (!size || size > MAX_PHOTO_BYTES)
    throw new Error("Choose a photo smaller than 10 MB.");
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v);
  const webp =
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (!jpeg && !png && !webp)
    throw new Error("Use a real JPEG, PNG, or WebP photo.");
}
export async function loadPhoto(file: File): Promise<HTMLCanvasElement> {
  validateImageBytes(
    new Uint8Array(await file.slice(0, 16).arrayBuffer()),
    file.size,
  );
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 160 || bitmap.height < 160)
      throw new Error("Use a clearer photo, at least 160 × 160 pixels.");
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error(
        "This image is too large. Resize it to under 40 megapixels.",
      );
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")!
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    bitmap.close();
  }
}
export function cropPhoto(
  source: HTMLCanvasElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1024;
  const side = Math.min(source.width, source.height) / zoom;
  const x = ((source.width - side) * offsetX) / 100;
  const y = ((source.height - side) * offsetY) / 100;
  canvas
    .getContext("2d")!
    .drawImage(source, x, y, side, side, 0, 0, 1024, 1024);
  return canvas;
}

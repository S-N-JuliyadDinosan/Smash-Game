import { mkdir, copyFile, readdir } from "node:fs/promises";
// npm ci verifies the lockfile integrity of the package containing Google's face model.
// No runtime CDN or model download is needed; all AI assets are served from this app.
const source = "node_modules/@mediapipe/face_mesh";
await mkdir("public/mediapipe", { recursive: true });
for (const name of await readdir(source)) {
  if (/\.(wasm|js|data|binarypb)$/.test(name))
    await copyFile(`${source}/${name}`, `public/mediapipe/${name}`);
}
await copyFile(
  "src/avatar/face-processor.js",
  "public/mediapipe/face-processor.js",
);
console.log(
  "Installed local MediaPipe face model, graph, and WASM from the integrity-locked npm package.",
);

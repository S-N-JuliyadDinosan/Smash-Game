import type { AvatarProvider, Landmark } from "./types";
function sample(photo: HTMLCanvasElement, x: number, y: number) {
  const ctx = photo.getContext("2d")!;
  const [r, g, b] = ctx.getImageData(
    Math.max(0, Math.min(photo.width - 1, Math.round(x * photo.width))),
    Math.max(0, Math.min(photo.height - 1, Math.round(y * photo.height))),
    1,
    1,
  ).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
export const localFaceProvider: AvatarProvider = {
  id: "local-mediapipe",
  name: "On-device face reconstruction",
  privacy:
    "Your photo is processed in this browser. No photograph or avatar is uploaded or stored on our server.",
  async generate(photo, onProgress, signal) {
    onProgress({ percent: 8, label: "Preparing your cropped photograph" });
    const bitmap = await createImageBitmap(photo);
    if (signal.aborted) {
      bitmap.close();
      throw new DOMException("Cancelled", "AbortError");
    }
    const landmarks = await new Promise<Landmark[]>((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.hidden = true;
      frame.title = "Private on-device face analysis";
      frame.src = "/face-processor.html";
      const jobId = crypto.randomUUID();
      const cleanup = () => {
        clearTimeout(timeout);
        frame.remove();
        window.removeEventListener("message", receive);
        signal.removeEventListener("abort", abort);
      };
      const abort = () => {
        cleanup();
        reject(new DOMException("Cancelled", "AbortError"));
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            "Face analysis timed out. Reload and try again; the local model may be unavailable.",
          ),
        );
      }, 90000);
      const receive = (e: MessageEvent) => {
        if (
          e.origin !== location.origin ||
          e.source !== frame.contentWindow ||
          e.data.jobId !== jobId
        )
          return;
        if (e.data.progress) onProgress(e.data.progress);
        if (e.data.error) {
          cleanup();
          reject(new Error(e.data.error));
        }
        if (e.data.landmarks) {
          cleanup();
          resolve(e.data.landmarks);
        }
      };
      signal.addEventListener("abort", abort, { once: true });
      window.addEventListener("message", receive);
      frame.onerror = () => {
        cleanup();
        reject(
          new Error(
            "The local AI assets could not load. Run npm run setup, then retry.",
          ),
        );
      };
      frame.onload = () =>
        frame.contentWindow?.postMessage(
          { type: "analyze-face", bitmap, jobId },
          location.origin,
          [bitmap],
        );
      document.body.appendChild(frame);
    });
    if (
      landmarks.length < 468 ||
      landmarks.some((p) => ![p.x, p.y, p.z].every(Number.isFinite))
    )
      throw new Error(
        "The face measurements were incomplete. Try a clearer frontal photo.",
      );
    const faceWidth = Math.abs(landmarks[454].x - landmarks[234].x);
    const faceHeight = Math.abs(landmarks[152].y - landmarks[10].y);
    if (faceWidth < 0.13)
      throw new Error(
        "Your face is too small in the crop. Zoom in and try again.",
      );
    const nose = landmarks[1],
      left = landmarks[234],
      right = landmarks[454];
    if (Math.abs((nose.x - left.x) / (right.x - left.x) - 0.5) > 0.3)
      throw new Error(
        "Please use a more front-facing photo so both sides of the face are visible.",
      );
    onProgress({
      percent: 80,
      label: "Projecting your photo onto the 3D face",
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const cheek = landmarks[50],
      forehead = landmarks[10];
    return {
      id: crypto.randomUUID(),
      photo,
      landmarks,
      faceWidth,
      faceHeight,
      skin: sample(photo, cheek.x, cheek.y),
      hair: sample(photo, forehead.x, Math.max(0, forehead.y - 0.045)),
    };
  },
};

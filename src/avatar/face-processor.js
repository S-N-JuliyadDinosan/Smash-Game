// Isolate each inference job in a same-origin frame so cancelling destroys model state.
window.addEventListener("message", async (event) => {
  if (
    event.origin !== location.origin ||
    event.source !== parent ||
    event.data.type !== "analyze-face"
  )
    return;
  const { bitmap, jobId } = event.data;
  const send = (data) =>
    parent.postMessage({ ...data, jobId }, location.origin);
  let detector;
  try {
    send({
      progress: { percent: 20, label: "Loading the on-device face model" },
    });
    detector = new window.FaceMesh({
      locateFile: (name) => `/mediapipe/${name}`,
    });
    detector.setOptions({
      selfieMode: false,
      maxNumFaces: 2,
      refineLandmarks: false,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
    });
    await detector.initialize();
    send({
      progress: { percent: 45, label: "Measuring facial landmarks and depth" },
    });
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    let faces;
    detector.onResults((result) => {
      faces = result.multiFaceLandmarks;
    });
    await detector.send({ image: canvas });
    if (!faces || faces.length !== 1)
      throw new Error(
        faces?.length
          ? "More than one face found. Crop the photo to one person."
          : "No clear face found. Try a well-lit, front-facing photo.",
      );
    send({ landmarks: faces[0] });
    canvas.width = canvas.height = 1;
  } catch (error) {
    console.error("Local face analysis failed:", error);
    send({
      error: /face found|one person/.test(error.message)
        ? error.message
        : "The face model could not process this photo. Check WebGL is enabled and try a clear frontal portrait.",
    });
  } finally {
    await detector?.close();
    bitmap.close();
  }
});

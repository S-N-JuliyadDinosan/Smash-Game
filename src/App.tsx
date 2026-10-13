import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronRight,
  Crosshair,
  Expand,
  ImagePlus,
  Info,
  LoaderCircle,
  LockKeyhole,
  Maximize,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { loadPhoto, cropPhoto } from "./avatar/validation";
import { localFaceProvider } from "./avatar/provider";
import type { AvatarData, GenerationProgress } from "./avatar/types";
import { exportAvatar } from "./avatar/model";
import { TOOLS, useGame } from "./store";
const Scene = lazy(() => import("./game/Scene"));
type Stage = "upload" | "processing" | "preview" | "play";
export default function App() {
  const [stage, setStage] = useState<Stage>("upload"),
    [source, setSource] = useState<HTMLCanvasElement>(),
    [avatar, setAvatar] = useState<AvatarData>();
  const [zoom, setZoom] = useState(1),
    [offsetX, setOffsetX] = useState(50),
    [offsetY, setOffsetY] = useState(50),
    [consent, setConsent] = useState(false);
  const [error, setError] = useState(""),
    [progress, setProgress] = useState<GenerationProgress>({
      percent: 0,
      label: "",
    }),
    [reset, setReset] = useState(0),
    [view, setView] = useState("front:0");
  const [drag, setDrag] = useState(false),
    [help, setHelp] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [moving, setMoving] = useState(false),
    [sceneReady, setSceneReady] = useState(false),
    [exporting, setExporting] = useState(false),
    [comboVisible, setComboVisible] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    cropCanvas = useRef<HTMLCanvasElement>(null),
    controller = useRef<AbortController | null>(null),
    arena = useRef<HTMLDivElement>(null);
  const {
    tool,
    setTool,
    score,
    combo,
    lastHit,
    sound,
    toggleSound,
    resetScore,
  } = useGame();
  const portraitPreview = useMemo(
    () => avatar?.photo.toDataURL("image/jpeg", 0.8),
    [avatar],
  );
  useEffect(() => {
    if (!source || !cropCanvas.current) return;
    const crop = cropPhoto(source, zoom, offsetX, offsetY);
    cropCanvas.current.getContext("2d")!.drawImage(crop, 0, 0, 320, 320);
  }, [source, zoom, offsetX, offsetY, stage]);
  useEffect(() => {
    if (!lastHit) return;
    setComboVisible(true);
    const timer = setTimeout(() => setComboVisible(false), 2200);
    return () => clearTimeout(timer);
  }, [lastHit]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelp(false);
        setPrivacy(false);
        return;
      }
      if (e.target instanceof HTMLInputElement || help || privacy) return;
      const selected = TOOLS.find((t) => t.key === e.key);
      if (selected) setTool(selected.id);
      if (e.key.toLowerCase() === "r" && stage === "play") resetCharacter();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const resetCharacter = () => {
    setSceneReady(false);
    setReset((n) => n + 1);
    setMoving(false);
  };
  async function chooseFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      const photo = await loadPhoto(file);
      setSource(photo);
      setZoom(1);
      setOffsetX(50);
      setOffsetY(50);
      setConsent(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open this image.");
    }
    if (input.current) input.current.value = "";
  }
  async function generate() {
    if (!source || !consent) return;
    setError("");
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setStage("processing");
    try {
      const result = await localFaceProvider.generate(
        cropPhoto(source, zoom, offsetX, offsetY),
        setProgress,
        abort.signal,
      );
      if (abort.signal.aborted) return;
      setProgress({
        percent: 100,
        label: "Your personalized character is ready",
      });
      setAvatar(result);
      setStage("preview");
      resetCharacter();
      resetScore();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setStage("upload");
      setError(
        e instanceof Error
          ? e.message
          : "Could not generate your character. Try another photo.",
      );
    }
  }
  function deletePhoto() {
    controller.current?.abort();
    setAvatar(undefined);
    setSource(undefined);
    setConsent(false);
    setStage("upload");
    setError("");
    setProgress({ percent: 0, label: "" });
    resetScore();
    resetCharacter();
    document.body.style.cursor = "auto";
  }
  async function download() {
    if (!avatar) return;
    setExporting(true);
    setError("");
    try {
      const blob = await exportAvatar(avatar),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = "my-photo-smash-avatar.glb";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed. Try again.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="app-shell">
      <header className="header">
        <a href="#" className="brand" aria-label="Photo Smash home">
          <span className="brand-mark">✳</span>
          <span>
            PHOTO<span className="brand-light">SMASH</span>
            <sup>3D</sup>
          </span>
        </a>
        <nav>
          <button onClick={() => setHelp(true)}>
            How to play <span>↗</span>
          </button>
          <span className="header-divider" />
          <span className="local-status">
            <i /> ALL CHAOS. ALL LOCAL.
          </span>
          <button
            className="icon-button sound-button"
            aria-label={sound ? "Mute sound" : "Enable sound"}
            onClick={toggleSound}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </nav>
      </header>
      <main>
        <section className="intro">
          <div>
            <div className="eyebrow">
              <span /> THE PERSONALIZED PHYSICS PLAYGROUND
            </div>
            <h1>
              Your face.
              <br className="mobile-break" /> <em>Full chaos.</em>
              <span className="title-spark">✳</span>
            </h1>
            <p>Upload a Face. Create a Character. Let the Chaos Begin.</p>
          </div>
          <div className="intro-note">
            <span className="note-icon">
              <Sparkles size={23} />
            </span>
            <div>
              A little stress relief.
              <br />
              <strong>A lot of personality.</strong>
            </div>
          </div>
        </section>
        <div className="workspace-grid">
          <aside className="creator-panel">
            <div className="panel-top">
              <span className="eyebrow">CHARACTER LAB</span>
              <span className="step-count">
                {stage === "upload"
                  ? "01"
                  : stage === "processing"
                    ? "02"
                    : "03"}{" "}
                / 03
              </span>
            </div>
            <div className="steps">
              <span className={stage === "upload" ? "current" : "done"}>
                1 <small>Upload</small>
              </span>
              <i />
              <span
                className={
                  stage === "processing" ? "current" : avatar ? "done" : ""
                }
              >
                2 <small>Create</small>
              </span>
              <i />
              <span className={avatar ? "current" : ""}>
                3 <small>Play</small>
              </span>
            </div>
            <div className="creator-content">
              {stage === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <h2>Make it you.</h2>
                  <p className="panel-copy">
                    One photo. Your very own character.
                    <br />
                    Endless questionable physics.
                  </p>
                  <input
                    ref={input}
                    aria-label="Upload a portrait"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    hidden
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      void chooseFile(e.target.files?.[0])
                    }
                  />
                  {!source ? (
                    <button
                      className={`upload-zone ${drag ? "dragging" : ""}`}
                      onClick={() => input.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDrag(true);
                      }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDrag(false);
                        void chooseFile(e.dataTransfer.files[0]);
                      }}
                    >
                      <span className="upload-icon">
                        <ImagePlus size={28} strokeWidth={1.5} />
                        <span>+</span>
                      </span>
                      <strong>Drop your photo here</strong>
                      <span>
                        or <u>browse files</u>
                      </span>
                      <small>JPG, PNG, WEBP · MAX 10 MB</small>
                    </button>
                  ) : (
                    <div className="crop-box">
                      <div className="crop-preview">
                        <canvas
                          ref={(element) => {
                            cropCanvas.current = element;
                            if (element && source) {
                              element
                                .getContext("2d")!
                                .drawImage(
                                  cropPhoto(source, zoom, offsetX, offsetY),
                                  0,
                                  0,
                                  320,
                                  320,
                                );
                            }
                          }}
                          width={320}
                          height={320}
                        />
                        <div className="crop-guide" />
                        <button
                          className="icon-button"
                          onClick={() => input.current?.click()}
                          aria-label="Choose a different photo"
                        >
                          <ImagePlus size={16} />
                        </button>
                      </div>
                      <label>
                        Zoom{" "}
                        <input
                          aria-label="Crop zoom"
                          type="range"
                          min="1"
                          max="3"
                          step=".05"
                          value={zoom}
                          onChange={(e) => setZoom(+e.target.value)}
                        />
                      </label>
                      <div className="crop-position">
                        <label>
                          Horizontal
                          <input
                            aria-label="Crop horizontal position"
                            type="range"
                            min="0"
                            max="100"
                            value={offsetX}
                            onChange={(e) => setOffsetX(+e.target.value)}
                          />
                        </label>
                        <label>
                          Vertical
                          <input
                            aria-label="Crop vertical position"
                            type="range"
                            min="0"
                            max="100"
                            value={offsetY}
                            onChange={(e) => setOffsetY(+e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                  <div className="photo-tip">
                    <span>✦</span> Front-facing. Well-lit. Just one face.
                  </div>
                  <label className="consent">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    <span>
                      I have permission to use this photo and the person’s
                      likeness.
                    </span>
                  </label>
                  <button
                    className="primary-button"
                    disabled={!source || !consent}
                    onClick={() => void generate()}
                  >
                    Generate my character <ArrowRight size={18} />
                  </button>
                  <p className="privacy-inline">
                    <LockKeyhole size={12} /> Your photo stays in your browser.
                  </p>
                </motion.div>
              )}
              {stage === "processing" && (
                <motion.div
                  key="processing"
                  className="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="processing-orbit">
                    <Crosshair size={48} />
                    <span />
                  </div>
                  <span className="tag">ON-DEVICE AI</span>
                  <h2>
                    Finding your
                    <br />
                    main character.
                  </h2>
                  <p role="status" aria-live="polite">
                    {progress.label}
                  </p>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuenow={progress.percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progress.percent}%` }} />
                  </div>
                  <span className="progress-number">{progress.percent}%</span>
                  <p className="subtle">
                    Your photo stays here. The first run may take a little
                    longer.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      controller.current?.abort();
                      setStage("upload");
                    }}
                  >
                    Cancel generation
                  </button>
                </motion.div>
              )}
              {(stage === "preview" || stage === "play") && avatar && (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="ready-tag">
                    <Check size={13} />{" "}
                    {stage === "play" ? "READY FOR CHAOS" : "CHARACTER CREATED"}
                  </div>
                  <h2>
                    {stage === "play"
                      ? "Meet your match."
                      : "Looking like you."}
                  </h2>
                  <p className="panel-copy">
                    Your photo. Your face mesh.
                    <br />
                    Your own little physics experiment.
                  </p>
                  <div className="identity-card">
                    <img src={portraitPreview} alt="Your cropped portrait" />
                    <div>
                      <strong>Your character</strong>
                      <span>468 facial landmarks</span>
                      <span className="local-label">
                        <i /> Generated locally
                      </span>
                    </div>
                  </div>
                  <div className="reconstruction-note">
                    <Info size={16} />
                    <p>
                      Your real photo is mapped to an AI-estimated face. Hair,
                      body, and hidden angles are approximated.
                    </p>
                  </div>
                  {stage === "preview" ? (
                    <button
                      className="primary-button"
                      onClick={() => {
                        setStage("play");
                        resetCharacter();
                      }}
                    >
                      Let’s make some chaos <Zap size={17} />
                    </button>
                  ) : (
                    <button className="primary-button" onClick={resetCharacter}>
                      <RotateCcw size={17} /> Reset character <kbd>R</kbd>
                    </button>
                  )}
                  <div className="character-actions">
                    <button
                      onClick={() => void download()}
                      disabled={exporting}
                    >
                      {exporting ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : (
                        <ArrowDownToLine size={15} />
                      )}{" "}
                      Export GLB
                    </button>
                    <button
                      onClick={() => {
                        setStage("upload");
                        setError("");
                        resetCharacter();
                      }}
                    >
                      <RotateCcw size={15} /> Recrop
                    </button>
                  </div>
                  <button className="new-photo-button" onClick={deletePhoto}>
                    <ImagePlus size={16} /> Upload a new photo{" "}
                    <ArrowRight size={15} />
                  </button>
                  <button className="delete-button" onClick={deletePhoto}>
                    <Trash2 size={13} /> Delete photo & avatar
                  </button>
                </motion.div>
              )}
            </div>
            {error && (
              <div className="error-message" role="alert">
                <Info size={17} />
                <span>{error}</span>
              </div>
            )}
            <div className="lab-footer">
              <ShieldCheck size={17} />
              <div>
                <strong>Private by design</strong>
                <span>No accounts. No uploads. No gallery.</span>
              </div>
              <button
                className="icon-button"
                onClick={() => setPrivacy(true)}
                aria-label="Read photo privacy details"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </aside>
          <section className="playground">
            <div className="arena" ref={arena} aria-label="3D playground" aria-busy={!sceneReady}>
              <div className="arena-top">
                <span className="arena-label">
                  <i />
                  {stage === "play"
                    ? "LIVE PLAYGROUND"
                    : avatar
                      ? "CHARACTER PREVIEW"
                      : "THE PLAYGROUND"}
                </span>
                <span className="arena-version">SANDBOX / 01</span>
              </div>
              <div className="arena-canvas">
                <Suspense
                  fallback={
                    <div className="scene-loading">
                      <LoaderCircle className="spin" /> Loading the playground…
                    </div>
                  }
                >
                  <Scene
                    data={avatar}
                    playable={stage === "play"}
                    reset={reset}
                    view={view}
                    onMotion={setMoving}
                    onReady={()=>setSceneReady(true)}
                  />
                </Suspense>
              </div>
              {!avatar && (
                <div className="demo-label">
                  <span>MEET THE STUNT DOUBLE</span>
                  <p>Your character takes it from here.</p>
                  <small>Preview only · upload your photo to play</small>
                </div>
              )}
              {stage === "play" && (
                <div className="scoreboard">
                  <span>CHAOS SCORE</span>
                  <strong data-testid="score">
                    {score.toLocaleString().padStart(5, "0")}
                  </strong>
                  <AnimatePresence>
                    {comboVisible && (
                      <motion.div
                        key={lastHit}
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="combo"
                      >
                        ×{combo} {combo > 1 ? "COMBO!" : "NICE ONE!"}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              <div className="arena-side">
                <button
                  className="icon-button"
                  onClick={() => {
                    setView(`front:${Date.now()}`);
                  }}
                  aria-label="Reset camera"
                >
                  <Crosshair size={18} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => {
                    if (document.fullscreenElement)
                      void document.exitFullscreen();
                    else
                      void arena.current
                        ?.requestFullscreen()
                        .catch(() =>
                          setError(
                            "Fullscreen is not available in this browser.",
                          ),
                        );
                  }}
                  aria-label="Toggle fullscreen"
                >
                  <Expand size={18} />
                </button>
              </div>
              <div className="arena-bottom">
                <div className="camera-tabs">
                  {["front", "side", "back"].map((v) => (
                    <button
                      className={view.startsWith(v) ? "active" : ""}
                      key={v}
                      onClick={() => setView(`${v}:${Date.now()}`)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <span className="camera-hint">
                  <Maximize size={13} /> Drag to orbit <b>·</b> Scroll to zoom
                </span>
              </div>
              {stage === "preview" && (
                <div className="preview-notice">
                  <Check size={14} /> Inspect your character, then jump in.
                </div>
              )}
              {stage === "play" && (
                <div className="play-instruction">
                  {moving
                    ? "Beautiful chaos. Press R to go again."
                    : "Choose a tool. Click your character. Let loose."}
                </div>
              )}
            </div>
            <div className="toolbox">
              <div className="toolbox-heading">
                <h3>
                  <Zap size={16} /> Pick your chaos
                </h3>
                {stage === "play" && <button className="restart-button" onClick={()=>{resetScore();resetCharacter();}}><RotateCcw size={12}/> Restart game</button>}
                <span>
                  {stage === "play"
                    ? TOOLS.find((t) => t.id === tool)?.hint
                    : "YOUR TOOLKIT IS WAITING"}
                </span>
              </div>
              <div className="tools">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    className={`tool ${tool === t.id ? "selected" : ""}`}
                    onClick={() => setTool(t.id)}
                    title={`${t.hint} · shortcut ${t.key}`}
                    aria-pressed={tool === t.id}
                  >
                    <kbd>{t.key}</kbd>
                    <span className="tool-emoji" aria-hidden="true">
                      {t.icon}
                    </span>
                    <span>{t.name}</span>
                    {tool === t.id && <i />}
                  </button>
                ))}
              </div>
              <div className="toolbox-footer">
                <span>
                  <span className="tiny-dot" />{" "}
                  {stage === "play"
                    ? "100% cartoon physics. Zero actual harm."
                    : "Create your character to unlock the playground."}
                </span>
                <span>1–9 TO SWITCH TOOLS</span>
              </div>
            </div>
          </section>
        </div>
        <section className="how-strip">
          <div>
            <span>01</span>
            <div>
              <strong>Bring a face</strong>
              <p>A clear photo. A familiar character.</p>
            </div>
          </div>
          <span className="strip-arrow">↗</span>
          <div>
            <span>02</span>
            <div>
              <strong>Make it personal</strong>
              <p>AI face mapping, right in your browser.</p>
            </div>
          </div>
          <span className="strip-arrow">↗</span>
          <div>
            <span>03</span>
            <div>
              <strong>Let it all out</strong>
              <p>Real physics. Ridiculous possibilities.</p>
            </div>
          </div>
          <span className="strip-star">✳</span>
        </section>
      </main>
      <footer>
        <span>
          PHOTO SMASH <b>© 2026</b>
        </span>
        <span>Made for a little harmless chaos.</span>
        <button onClick={() => setPrivacy(true)}>
          Privacy & your photos <ArrowRight size={12} />
        </button>
      </footer>
      {(help || privacy) && (
        <div
          className="modal-backdrop"
          onClick={() => {
            setHelp(false);
            setPrivacy(false);
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="icon-button modal-close"
              aria-label="Close dialog"
              onClick={() => {
                setHelp(false);
                setPrivacy(false);
              }}
              autoFocus
            >
              <X size={20} />
            </button>
            <span className="eyebrow">
              {privacy ? "YOUR FACE. YOUR BUSINESS." : "A QUICK FIELD GUIDE"}
            </span>
            <h2 id="modal-title">
              {privacy ? "Private by design." : "A crash course in chaos."}
            </h2>
            {privacy ? (
              <>
                <p>
                  Your photograph is decoded, cropped, and analyzed on your
                  device using Google’s MediaPipe Face Mesh model. It never
                  leaves this browser. There is no external AI API, account, or
                  photo storage service.
                </p>
                <p>
                  The generated avatar and photo live in memory until you delete
                  them, close, or reload this page. Exporting a GLB saves a file
                  to your device that contains the face texture; keep it
                  private. Deleting here does not remove a file you have
                  downloaded.
                </p>
                <p>
                  Only use a likeness you have permission to use. A single
                  photograph cannot recover accurate hidden geometry, a complete
                  hairstyle, or body shape. This is a stylized, estimated 3D
                  reconstruction, most recognizable from the front.
                </p>
              </>
            ) : (
              <>
                <ol>
                  <li>
                    Upload one clear frontal portrait and confirm you have
                    permission.
                  </li>
                  <li>
                    Crop so the entire face fits inside the guide. Generate and
                    inspect it from all angles.
                  </li>
                  <li>
                    Enter the playground, choose a tool, and click or tap the
                    character to apply a physical impulse.
                  </li>
                </ol>
                <p>
                  Drag to orbit, pinch or scroll to zoom. Use keys <b>1–9</b>{" "}
                  for tools and <b>R</b> to reset the character. Sound is off
                  until you enable it. The gravity tool lasts three seconds.
                </p>
                <p>
                  Everything is cartoon slapstick. The stunt double is a
                  preview; gameplay always uses your generated face.
                </p>
              </>
            )}
            <button
              className="primary-button"
              onClick={() => {
                setHelp(false);
                setPrivacy(false);
              }}
            >
              Got it <Check size={17} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}

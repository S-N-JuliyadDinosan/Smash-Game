# Photo Smash 3D

A private, browser-based photo-to-avatar playground. Upload a portrait, crop it, generate a personalized 3D face, inspect the avatar, then play with nine cartoon tools and an articulated Rapier ragdoll.

## Run

Requires Node.js 22+ and a modern browser with WebGL 2. Tested with Node 24 and Chromium.

```sh
npm ci
npm run setup
npm run dev
```

`setup` copies the face model, graph, and WASM from Google's official `@mediapipe/face_mesh` npm package into `public/mediapipe`. The lockfile verifies downloaded package integrity. No API credentials, separate model downloads, or runtime CDN requests are needed. Run setup after updating that package or the inference adapter.

For the cloud sandbox, use `npm ci --cache /workspace/.npm-cache` if the default npm cache is not writable. Use the existing `/workspace/Smash-Game` checkout; do not create a Git worktree unless explicitly requested.

Production:

```sh
npm run build
npm start
```

Express serves `dist` on port 3000 (`PORT` overrides it), with Helmet security headers. `GET /api/health` reports readiness and the local provider. The development server uses port 5173. This is a static, local-inference application: no photograph upload endpoint, database, authentication service, or private server-side storage is needed. Use TLS at the hosting platform for deployment.

## What the reconstruction actually does

1. Checks JPEG/PNG/WebP magic bytes, a 10 MB file limit, minimum dimensions, and a decoded pixel limit. Decodes image orientation and downsizes to at most 1600 pixels per side.
2. Lets the user crop, zoom, and position a square portrait and explicitly confirm likeness permission.
3. Runs **Google MediaPipe Face Mesh** locally in an isolated, same-origin processing frame. Its neural model estimates 468 facial landmarks, including relative depth. Cancel, error, and completion destroy the processing frame and release model state.
4. Rejects no-face images, multiple detected faces, very small faces, and extreme side views. Triangulates measured landmarks into a 3D face and projects the actual photo through UV coordinates. Samples visible color for the head and hair approximation.
5. Attaches that head to a stylized humanoid with 11 body segments. The preview and arena use the same generated face geometry and texture, with no generic substitution on failure.
6. Exports a binary GLB with embedded face texture, 11-bone skinning, and a gentle idle animation. The live arena uses those body segments as rigid bodies joined at neck, spine, shoulders, hips, elbows, and knees. Elbows and knees have angular limits.

This is **landmark-based, photo-textured 3D estimation**, not a photogrammetric scan or photorealistic full-body reconstruction. Frontal likeness comes from the user's actual facial texture and measured proportions. Hidden geometry, ears, side/back profiles, hairstyle, clothing, and body shape are approximate. Hair starts as a sampled-color crop; the wardrobe provides 13 optional sculpted hairstyles and color controls. These are stylized meshes, not reconstructed strands or segmentation. Hair visible within the original face texture cannot be removed by selecting a hairstyle. Strong expressions and poor lighting can appear baked into the face. The single-photo mode is implemented; optional multi-photo fusion is not.

The `AvatarProvider` interface in `src/avatar/types.ts` separates reconstruction from the app. `localFaceProvider` is the working implementation. There are no invented third-party endpoints or unimplemented success stubs. A future external provider must disclose its data handling and add server-side authentication, image validation, private storage, job ownership, retention/deletion, rate limiting, and credential configuration before accepting real photos.

## Controls and gameplay

- Click/tap the generated character to use the selected tool at the hit point.
- Drag to orbit; scroll or pinch to zoom. Front/side/back buttons reset the camera.
- **1–9** choose foam hammer, boxing glove, rubber ball, wind, spring, inflatable hand, gravity, banana, or confetti.
- After a hit, the character automatically gets back up: a fallen pose is detected after a short reaction window, followed by a 0.45-second assisted return to standing. Airborne reactions are capped at about 2.4 seconds before recovery; the gravity tool completes its three-second effect first. Recovery keeps the face, outfit, hairstyle, and score. Hits are briefly paused during the get-up transition.
- **R** resets the character to its starting pose. The score stays for the current session. **Restart game** clears the score and resets the same avatar.
- Gravity reverses gently for three seconds. Ball shots create colliding, bouncing rigid bodies. Other tools apply distinct impulses or torque, with visual effects and optional synthesized audio.
- Successive interactions within 2.2 seconds build a combo, capped at 10×.
- Sound starts muted. Reset restores a stable pose; the character is held in an idle stance until the first interaction, then released into full ragdoll physics.
- The robot shown before upload is explicitly a non-playable stunt-double preview. Only a successfully generated photo avatar can enter gameplay.

## Outfits and hairstyles

After generating a character, open **Make the look yours** below the arena. All looks are available to every character; Men, Women, and Unisex are browsing groups only.

- **13 outfits:** tracksuit, T-shirt and jeans, hoodie and joggers, utility jumpsuit, suit and tie, kurta and trousers, jersey and shorts, blazer and trousers, blouse and pleated skirt, A-line dress, evening gown, sari, and salwar kameez.
- **13 hairstyles:** short crop, buzz cut, side part, quiff, spikes, bob, long straight hair, ponytail, bun, twin braids, curls, afro, and no added hair.
- Choose outfit and hair colors, restore an outfit's original palette, sample the photo's hair color again, or reset the whole look.
- Appearance changes stand the character up without clearing the score or rerunning face reconstruction. Preview, gameplay, manual/automatic reset, and GLB export all use the selected appearance.
- Garments and hair follow their body segments as stylized meshes. They do not have independent cloth or strand simulation. This is an initial collection, not an exhaustive wardrobe of every clothing style.

## Privacy

Photos and avatars remain in browser memory. No photo is sent to Express, an AI provider, analytics, or a gallery. Reload/close or **Delete photo & avatar** releases the app's references; there is no local-storage/IndexedDB persistence. Export explicitly downloads a GLB containing the identifiable face texture. Deleting in the app cannot delete exported files on the user's device.

The application has no accounts because there is no remote personal-data storage. Application/model assets are normal static requests. Consent is required before inference. The main-page CSP allows local WASM execution but no external scripts or API connections. The isolated face-processing frame alone permits JavaScript evaluation because MediaPipe’s Emscripten bindings require generated functions; it still allows only same-origin scripts and connections.

## Validation

```sh
npm test
npm run build
# With npm run dev running in another terminal:
npm run test:e2e
# Or test production while npm start is running:
TEST_BASE_URL=http://127.0.0.1:3000 npm run test:e2e
```

Playwright uses `/usr/bin/chromium` by default; set `CHROMIUM_PATH` if needed. The cloud tests use Chromium's software WebGL renderer. The tests run the actual face model and Rapier simulation, not mocked model responses. They cover consent gating, photo processing, GLB structure and embedded image, camera views, tools, visible physical movement, repeated automatic recovery, wardrobe selection and colors, unchanged face textures in customized GLBs, reset, regeneration, deletion, invalid images, no-face errors, and mobile layout. Geometry tests cover every outfit and hairstyle. Screenshots are saved under ignored `test-results`.

The test portraits are the public-domain NASA astronaut Eileen Collins image distributed with scikit-image and the U.S. Navy Grace Hopper portrait distributed with Matplotlib. See `tests/fixtures/README.md`. It is a test fixture only, never a default user avatar.

## Structure

- `src/avatar/`: image validation, cropping, local provider, inference adapter, face mesh, body geometry, GLB rig/export.
- `src/game/Scene.tsx`: Three.js scene, camera, constrained Rapier bodies, tool impulses, projectiles, effects.
- `src/store.ts`: tools, scoring, combos, synthesized audio.
- `src/App.tsx`: consent/upload, generation progress, preview, gameplay, export, privacy/deletion.
- `server/index.ts`: production static serving and health check.
- `scripts/setup-model.mjs`: repeatable installation of local model assets.

The initial JavaScript payload includes the 3D and physics runtimes, so Vite reports a large-chunk advisory. Model assets total about 16 MB and are downloaded only from this app's origin on first generation. Actual production hosting, mobile hardware performance, and broad cross-browser testing remain deployment checks.

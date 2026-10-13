import * as THREE from "three";
import { OUTFITS, type Appearance } from "./appearance";
import type { PartName } from "./model";
function ellipsoid(
  group: THREE.Group,
  mat: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
function box(
  group: THREE.Group,
  mat: THREE.Material,
  size: [number, number, number],
  position: [number, number, number],
  rotation = 0,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.rotation.z = rotation;
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
export function addHair(
  group: THREE.Group,
  appearance: Appearance,
  color: string,
) {
  const hair = new THREE.Group();
  hair.name = `Hairstyle: ${appearance.hairstyle}`;
  group.add(hair);
  if (appearance.hairstyle === "bald") return;
  const mat = new THREE.MeshStandardMaterial({
    color: appearance.hairColor || color,
    roughness: 0.88,
  });
  const style = appearance.hairstyle;
  // Leave the front face unobstructed; the crown and all added lengths sit behind its texture.
  ellipsoid(
    hair,
    mat,
    [0.35, style === "buzz" ? 0.095 : 0.17, 0.32],
    [0, 0.35, -0.16],
  );
  if (style === "sidepart" || style === "quiff") {
    const sweep = ellipsoid(
      hair,
      mat,
      [0.32, style === "quiff" ? 0.2 : 0.11, 0.26],
      [-0.06, style === "quiff" ? 0.47 : 0.43, -0.1],
    );
    sweep.rotation.z = -0.2;
    ellipsoid(hair, mat, [0.09, 0.25, 0.24], [0.29, 0.16, -0.18]);
  }
  if (["bob", "long", "braids", "ponytail", "bun"].includes(style)) {
    ellipsoid(
      hair,
      mat,
      [0.33, style === "long" ? 0.62 : 0.37, 0.21],
      [0, style === "long" ? -0.12 : 0.03, -0.34],
    );
    if (style === "bob" || style === "long")
      for (const x of [-0.32, 0.32])
        ellipsoid(
          hair,
          mat,
          [0.085, style === "long" ? 0.52 : 0.32, 0.22],
          [x, style === "long" ? -0.12 : 0.04, -0.12],
        );
  }
  if (style === "ponytail") {
    ellipsoid(hair, mat, [0.14, 0.16, 0.17], [0, 0.32, -0.51]);
    ellipsoid(hair, mat, [0.16, 0.52, 0.18], [0, -0.07, -0.57]);
  }
  if (style === "bun")
    ellipsoid(hair, mat, [0.21, 0.22, 0.21], [0, 0.57, -0.27]);
  if (style === "braids")
    for (const sign of [-1, 1])
      for (let i = 0; i < 7; i++)
        ellipsoid(
          hair,
          mat,
          [0.085 - i * 0.004, 0.1, 0.09],
          [sign * (0.34 + (i % 2) * 0.025), 0.12 - i * 0.115, -0.17],
        );
  if (style === "spikes")
    for (let i = 0; i < 7; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.09, 0.23 + (i % 3) * 0.025, 7),
        mat,
      );
      cone.position.set((i - 3) * 0.095, 0.51, -0.14);
      cone.rotation.z = -(i - 3) * 0.1;
      cone.castShadow = true;
      hair.add(cone);
    }
  if (style === "curls" || style === "afro") {
    const afro = style === "afro";
    for (let row = 0; row < 3; row++)
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ellipsoid(
          hair,
          mat,
          [afro ? 0.13 : 0.085, afro ? 0.14 : 0.095, afro ? 0.13 : 0.085],
          [
            Math.cos(a) * (afro ? 0.32 : 0.29),
            0.31 + row * (afro ? 0.115 : 0.075),
            -0.16 + Math.sin(a) * 0.24,
          ],
        );
      }
    for (const sign of [-1, 1])
      ellipsoid(
        hair,
        mat,
        [afro ? 0.15 : 0.09, afro ? 0.26 : 0.16, 0.23],
        [sign * (afro ? 0.34 : 0.31), 0.13, -0.19],
      );
  }
}
function skirt(
  group: THREE.Group,
  mat: THREE.Material,
  length: number,
  radius: number,
  pleated = false,
) {
  const geometry = new THREE.CylinderGeometry(
    0.32,
    radius,
    length,
    48,
    1,
    false,
  );
  if (pleated) {
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i),
        r = Math.hypot(x, z);
      if (r > 0.001) {
        const a = Math.atan2(z, x),
          factor = 1 + 0.045 * Math.cos(a * 16);
        pos.setX(i, x * factor);
        pos.setZ(i, z * factor);
      }
    }
    geometry.computeVertexNormals();
  }
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.position.y = 0.17 - length / 2;
  mesh.scale.z = 0.8;
  mesh.castShadow = true;
  mesh.name = "Garment skirt";
  group.add(mesh);
}
export function addClothing(
  group: THREE.Group,
  name: PartName,
  appearance: Appearance,
) {
  const outfit = OUTFITS.find((o) => o.id === appearance.outfit)!;
  const top = new THREE.MeshStandardMaterial({
    color: appearance.outfitColor || outfit.top,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const bottom = new THREE.MeshStandardMaterial({
    color: ["dress", "gown"].includes(outfit.shape)
      ? appearance.outfitColor || outfit.bottom
      : outfit.bottom,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: outfit.accent,
    roughness: 0.55,
  });
  const white = new THREE.MeshStandardMaterial({
    color: "#f4ecdd",
    roughness: 0.8,
  });
  // Only allocate materials for meshes that are actually added, avoiding unused material leaks.
  const before = new Set(group.children);
  if (name === "chest") {
    if (outfit.shape === "suit") {
      box(group, white, [0.22, 0.46, 0.045], [0, 0.03, 0.198]);
      box(group, top, [0.12, 0.38, 0.055], [-0.14, 0.09, 0.23], -0.36);
      box(group, top, [0.12, 0.38, 0.055], [0.14, 0.09, 0.23], 0.36);
      box(group, accent, [0.065, 0.3, 0.02], [0, 0.04, 0.245]);
    } else if (outfit.shape === "hoodie") {
      const hood = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.085, 10, 24, Math.PI * 1.5),
        top,
      );
      hood.position.set(0, 0.24, -0.13);
      hood.rotation.x = 0.4;
      group.add(hood);
      box(group, accent, [0.3, 0.12, 0.025], [0, -0.12, 0.205]);
      for (const x of [-0.09, 0.09])
        box(group, white, [0.014, 0.23, 0.02], [x, 0.1, 0.215]);
    } else if (["sari", "salwar"].includes(outfit.shape)) {
      box(group, accent, [0.18, 0.72, 0.04], [0.04, 0.02, 0.235], -0.42);
      if (outfit.shape === "salwar")
        box(group, accent, [0.13, 0.65, 0.04], [0.27, -0.07, -0.19]);
    } else if (["dress", "gown", "skirt"].includes(outfit.shape)) {
      box(group, accent, [0.55, 0.065, 0.4], [0, -0.23, 0]);
      ellipsoid(group, accent, [0.045, 0.045, 0.025], [0, 0.22, 0.21]);
    } else if (outfit.shape === "kurta") {
      box(group, accent, [0.065, 0.28, 0.025], [0, 0.15, 0.215]);
      for (let i = 0; i < 3; i++)
        ellipsoid(
          group,
          white,
          [0.014, 0.014, 0.01],
          [0, 0.22 - i * 0.07, 0.236],
        );
    } else {
      box(group, accent, [0.22, 0.1, 0.02], [-0.14, 0.1, 0.205]);
      if (outfit.shape !== "tee")
        box(group, accent, [0.016, 0.48, 0.02], [0, 0, 0.207]);
    }
  }
  if (name === "hips") {
    if (outfit.shape === "skirt") skirt(group, bottom, 0.64, 0.5, true);
    if (outfit.shape === "dress") skirt(group, bottom, 0.9, 0.54);
    if (outfit.shape === "gown") skirt(group, bottom, 1.3, 0.58);
    if (outfit.shape === "sari") {
      skirt(group, bottom, 1.26, 0.4, true);
      box(group, accent, [0.11, 1.18, 0.025], [0.12, -0.41, 0.34]);
    }
    if (["kurta", "salwar"].includes(outfit.shape))
      skirt(group, top, 0.65, 0.36);
  }
  const used = new Set<THREE.Material>();
  group.children
    .filter((c) => !before.has(c))
    .forEach((c) => {
      if (c instanceof THREE.Mesh)
        (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) =>
          used.add(m),
        );
    });
  [top, bottom, accent, white]
    .filter((m) => !used.has(m))
    .forEach((m) => m.dispose());
}

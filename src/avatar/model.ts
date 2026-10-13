import * as THREE from "three";
import Delaunator from "delaunator";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import type { AvatarData } from "./types";
export type PartName =
  | "hips"
  | "chest"
  | "head"
  | "upperArmL"
  | "forearmL"
  | "upperArmR"
  | "forearmR"
  | "thighL"
  | "shinL"
  | "thighR"
  | "shinR";
export type Part = {
  name: PartName;
  position: [number, number, number];
  size: [number, number, number];
  parent?: PartName;
  anchor?: [number, number, number];
  hinge?: boolean;
};
export const PARTS: Part[] = [
  { name: "hips", position: [0, 1.52, 0], size: [0.58, 0.32, 0.35] },
  {
    name: "chest",
    position: [0, 2.01, 0],
    size: [0.75, 0.65, 0.38],
    parent: "hips",
    anchor: [0, 1.7, 0],
  },
  {
    name: "head",
    position: [0, 2.83, 0],
    size: [0.65, 0.84, 0.6],
    parent: "chest",
    anchor: [0, 2.43, 0],
  },
  {
    name: "upperArmL",
    position: [-0.57, 2.03, 0],
    size: [0.23, 0.57, 0.25],
    parent: "chest",
    anchor: [-0.43, 2.27, 0],
  },
  {
    name: "forearmL",
    position: [-0.66, 1.48, 0.02],
    size: [0.21, 0.5, 0.23],
    parent: "upperArmL",
    anchor: [-0.64, 1.75, 0],
    hinge: true,
  },
  {
    name: "upperArmR",
    position: [0.57, 2.03, 0],
    size: [0.23, 0.57, 0.25],
    parent: "chest",
    anchor: [0.43, 2.27, 0],
  },
  {
    name: "forearmR",
    position: [0.66, 1.48, 0.02],
    size: [0.21, 0.5, 0.23],
    parent: "upperArmR",
    anchor: [0.64, 1.75, 0],
    hinge: true,
  },
  {
    name: "thighL",
    position: [-0.19, 1.06, 0],
    size: [0.26, 0.64, 0.29],
    parent: "hips",
    anchor: [-0.2, 1.38, 0],
  },
  {
    name: "shinL",
    position: [-0.19, 0.43, 0],
    size: [0.23, 0.59, 0.25],
    parent: "thighL",
    anchor: [-0.19, 0.75, 0],
    hinge: true,
  },
  {
    name: "thighR",
    position: [0.19, 1.06, 0],
    size: [0.26, 0.64, 0.29],
    parent: "hips",
    anchor: [0.2, 1.38, 0],
  },
  {
    name: "shinR",
    position: [0.19, 0.43, 0],
    size: [0.23, 0.59, 0.25],
    parent: "thighR",
    anchor: [0.19, 0.75, 0],
    hinge: true,
  },
];
export function faceGeometry(data: AvatarData) {
  const points = data.landmarks.slice(0, 468);
  const centerX = (points[234].x + points[454].x) / 2;
  const centerY = (points[10].y + points[152].y) / 2;
  const scale = 0.68 / data.faceWidth;
  const positions: number[] = [],
    uv: number[] = [];
  for (const p of points) {
    positions.push(
      (p.x - centerX) * scale,
      (centerY - p.y) * scale,
      0.16 - p.z * scale,
    );
    uv.push(p.x, 1 - p.y);
  }
  const triangulation = Delaunator.from(
    points,
    (p) => p.x,
    (p) => p.y,
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  // Delaunay runs in image coordinates; reverse winding for world-space Y-up.
  const indices = Array.from(triangulation.triangles);
  for (let i = 0; i < indices.length; i += 3)
    [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]];
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
function material(color: string) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
}
function sphere(
  group: THREE.Group,
  size: [number, number, number],
  mat: THREE.Material,
  position: [number, number, number] = [0, 0, 0],
) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 20), mat);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}
export function makeParts(data?: AvatarData) {
  const result = {} as Record<PartName, THREE.Group>;
  const purple = material("#8c6bef"),
    dark = material("#33323e"),
    skin = material(data?.skin || "#c5b4f0"),
    lime = material("#d5ff70");
  for (const part of PARTS) {
    const group = new THREE.Group();
    group.name = part.name;
    const [w, h, d] = part.size;
    if (part.name === "head") {
      sphere(group, [0.325, 0.43, 0.3], skin, [0, 0, -0.13]);
      sphere(group, [0.12, 0.17, 0.12], skin, [0, -0.43, -0.02]);
      sphere(
        group,
        [0.346, 0.18, 0.3],
        material(data?.hair || "#62507b"),
        [0, 0.34, -0.14],
      );
      sphere(group, [0.055, 0.105, 0.06], skin, [-0.335, -0.015, -0.03]);
      sphere(group, [0.055, 0.105, 0.06], skin, [0.335, -0.015, -0.03]);
      if (data) {
        const texture = new THREE.CanvasTexture(data.photo);
        texture.colorSpace = THREE.SRGBColorSpace;
        const face = new THREE.Mesh(
          faceGeometry(data),
          new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 1,
            side: THREE.DoubleSide,
          }),
        );
        face.name = "Personalized photo-projected face";
        face.castShadow = true;
        group.add(face);
      } else {
        const visor = new THREE.Mesh(
          new THREE.BoxGeometry(0.48, 0.19, 0.1),
          material("#242331"),
        );
        visor.position.set(0, 0.04, 0.175);
        group.add(visor);
        sphere(group, [0.036, 0.045, 0.035], lime, [-0.12, 0.055, 0.235]);
        sphere(group, [0.036, 0.045, 0.035], lime, [0.12, 0.055, 0.235]);
      }
    } else {
      const isLeg = /thigh|shin/.test(part.name),
        isHand = /forearm/.test(part.name);
      const mesh = new THREE.Mesh(
        new THREE.CapsuleGeometry(w / 2, Math.max(0.01, h - w), 5, 12),
        isLeg ? dark : purple,
      );
      mesh.scale.z = d / w;
      mesh.scale.y = h / Math.max(h, w + 0.01);
      mesh.castShadow = true;
      group.add(mesh);
      if (part.name === "chest") {
        const patch = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.1, 0.018),
          lime,
        );
        patch.position.set(-0.14, 0.1, 0.2);
        group.add(patch);
        const zipper = new THREE.Mesh(
          new THREE.BoxGeometry(0.015, 0.48, 0.018),
          dark,
        );
        zipper.position.z = 0.202;
        group.add(zipper);
      }
      if (isHand) sphere(group, [0.13, 0.14, 0.13], skin, [0, -h / 2, 0.02]);
      if (/shin/.test(part.name))
        sphere(group, [0.15, 0.12, 0.26], lime, [0, -h / 2, 0.1]);
    }
    if (part.parent && part.anchor) {
      const local = part.anchor.map((v, i) => v - part.position[i]) as [
        number,
        number,
        number,
      ];
      if (part.name !== "head")
        sphere(group, [0.105, 0.105, 0.105], dark, local);
    }
    result[part.name] = group;
  }
  return result;
}
export function disposeParts(parts: Record<PartName, THREE.Group>) {
  const materials = new Set<THREE.Material>();
  Object.values(parts).forEach((group) =>
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(
          (m) => materials.add(m),
        );
      }
    }),
  );
  materials.forEach((m) => {
    if (m instanceof THREE.MeshStandardMaterial) m.map?.dispose();
    m.dispose();
  });
}
export async function exportAvatar(data: AvatarData) {
  const parts = makeParts(data),
    root = new THREE.Group();
  root.name = "Photo Smash personalized avatar";
  const bones = PARTS.map((p) => {
    const b = new THREE.Bone();
    b.name = p.name;
    return b;
  });
  PARTS.forEach((p, i) => {
    if (p.parent) {
      const pi = PARTS.findIndex((x) => x.name === p.parent);
      bones[pi].add(bones[i]);
      bones[i].position
        .set(...p.position)
        .sub(new THREE.Vector3(...PARTS[pi].position));
    } else {
      root.add(bones[i]);
      bones[i].position.set(...p.position);
    }
  });
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  PARTS.forEach((part, index) => {
    const group = parts[part.name];
    group.position.set(...part.position);
    group.updateMatrixWorld(true);
    group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        const geometry = obj.geometry.clone();
        geometry.applyMatrix4(obj.matrixWorld);
        const n = geometry.attributes.position.count,
          weights = new Float32Array(n * 4),
          indices = new Uint16Array(n * 4);
        for (let i = 0; i < n; i++) {
          weights[i * 4] = 1;
          indices[i * 4] = index;
        }
        geometry.setAttribute(
          "skinIndex",
          new THREE.Uint16BufferAttribute(indices, 4),
        );
        geometry.setAttribute(
          "skinWeight",
          new THREE.Float32BufferAttribute(weights, 4),
        );
        const skinned = new THREE.SkinnedMesh(geometry, obj.material);
        skinned.name = obj.name || part.name;
        root.add(skinned);
        skinned.bind(skeleton);
      }
    });
  });
  const track = new THREE.QuaternionKeyframeTrack(
    "chest.quaternion",
    [0, 1.5, 3],
    [0, 0, -0.012, 0.999928, 0, 0, 0.012, 0.999928, 0, 0, -0.012, 0.999928],
  );
  try {
    const result = await new GLTFExporter().parseAsync(root, {
      binary: true,
      animations: [new THREE.AnimationClip("Gentle idle", 3, [track])],
    });
    if (
      !(result instanceof ArrayBuffer) ||
      new DataView(result).getUint32(0, true) !== 0x46546c67
    )
      throw new Error("Could not create a valid GLB.");
    return new Blob([result], { type: "model/gltf-binary" });
  } finally {
    root.traverse((obj) => {
      if (obj instanceof THREE.Mesh) obj.geometry.dispose();
    });
    disposeParts(parts);
  }
}

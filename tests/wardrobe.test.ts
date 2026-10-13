import { describe, it, expect } from "vitest";
import * as THREE from "three";
import {
  OUTFITS,
  HAIRSTYLES,
  DEFAULT_APPEARANCE,
} from "../src/avatar/appearance";
import { makeParts, disposeParts, PARTS } from "../src/avatar/model";
function assertGeometry(parts: ReturnType<typeof makeParts>) {
  expect(Object.keys(parts)).toHaveLength(PARTS.length);
  for (const group of Object.values(parts))
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        expect(
          Array.from(o.geometry.attributes.position.array).every(
            Number.isFinite,
          ),
        ).toBe(true);
        expect(o.geometry.attributes.position.count).toBeGreaterThan(0);
      }
    });
}
describe("wearable geometry", () => {
  it.each(OUTFITS)("builds and disposes the $name outfit", (outfit) => {
    const parts = makeParts(undefined, {
      ...DEFAULT_APPEARANCE,
      outfit: outfit.id,
    });
    try {
      assertGeometry(parts);
      if (
        ["skirt", "dress", "gown", "sari", "kurta", "salwar"].includes(
          outfit.shape,
        )
      )
        expect(parts.hips.getObjectByName("Garment skirt")).toBeDefined();
    } finally {
      disposeParts(parts);
    }
  });
  it.each(HAIRSTYLES)(
    "builds the $name hairstyle without replacing the head",
    (hair) => {
      const parts = makeParts(undefined, {
        ...DEFAULT_APPEARANCE,
        hairstyle: hair.id,
        hairColor: "#b24394",
      });
      try {
        assertGeometry(parts);
        const geometry = parts.head.getObjectByName(`Hairstyle: ${hair.id}`)!;
        expect(geometry).toBeDefined();
        if (hair.id === "bald") expect(geometry.children).toHaveLength(0);
        else expect(geometry.children.length).toBeGreaterThan(0);
      } finally {
        disposeParts(parts);
      }
    },
  );
  it("applies custom outfit and hair colors to separate meshes", () => {
    const parts = makeParts(undefined, {
      ...DEFAULT_APPEARANCE,
      outfit: "dress",
      hairstyle: "braids",
      outfitColor: "#112233",
      hairColor: "#aabbcc",
    });
    try {
      expect(
        (
          (parts.chest.children[0] as THREE.Mesh)
            .material as THREE.MeshStandardMaterial
        ).color.getHexString(),
      ).toBe("112233");
      const hair = parts.head.getObjectByName("Hairstyle: braids")!;
      expect(
        (
          (hair.children[0] as THREE.Mesh)
            .material as THREE.MeshStandardMaterial
        ).color.getHexString(),
      ).toBe("aabbcc");
    } finally {
      disposeParts(parts);
    }
  });
});

import {
  OUTFITS,
  HAIRSTYLES,
  DEFAULT_APPEARANCE,
  type Appearance,
  type OutfitId,
  type HairId,
} from "./appearance";
const GROUPS = ["Unisex", "Men", "Women"] as const;
export default function Wardrobe({
  appearance,
  onChange,
  photoHair,
}: {
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
  photoHair: string;
}) {
  const selected = OUTFITS.find((o) => o.id === appearance.outfit)!;
  return (
    <section className="wardrobe-panel" aria-label="Character wardrobe">
      <div className="wardrobe-heading">
        <div>
          <h3>Make the look yours</h3>
          <p>Mix any outfit with any hairstyle. Your face stays the same.</p>
        </div>
        <button onClick={() => onChange({ ...DEFAULT_APPEARANCE })}>
          Reset look
        </button>
      </div>
      <div className="wardrobe-fields">
        <label>
          Outfit
          <select
            aria-label="Outfit"
            value={appearance.outfit}
            onChange={(e) =>
              onChange({
                ...appearance,
                outfit: e.target.value as OutfitId,
                outfitColor: null,
              })
            }
          >
            {GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {OUTFITS.filter((o) => o.category === group).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label>
          Hairstyle
          <select
            aria-label="Hairstyle"
            value={appearance.hairstyle}
            onChange={(e) =>
              onChange({ ...appearance, hairstyle: e.target.value as HairId })
            }
          >
            {GROUPS.map((group) => (
              <optgroup key={group} label={group}>
                {HAIRSTYLES.filter((h) => h.category === group).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="wardrobe-color">
          <label>
            <input
              aria-label="Outfit color"
              type="color"
              value={appearance.outfitColor || selected.top}
              onChange={(e) =>
                onChange({ ...appearance, outfitColor: e.target.value })
              }
            />{" "}
            Outfit color
          </label>
          <button
            onClick={() => onChange({ ...appearance, outfitColor: null })}
          >
            Original
          </button>
        </div>
        <div className="wardrobe-color">
          <label>
            <input
              aria-label="Hair color"
              type="color"
              value={appearance.hairColor || photoHair}
              onChange={(e) =>
                onChange({ ...appearance, hairColor: e.target.value })
              }
            />{" "}
            Hair color
          </label>
          <button onClick={() => onChange({ ...appearance, hairColor: null })}>
            From photo
          </button>
        </div>
      </div>
      <p className="wardrobe-note">
        Style changes stand your character up and keep your score. Hair already
        visible in the face photo remains part of its texture.
      </p>
    </section>
  );
}
